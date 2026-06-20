import { pool } from "../config/db.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { executeSubmission } from "../utils/codeExecution.js";

function normalizeStringArray(values, formatter = (value) => value) {
  if (!Array.isArray(values)) {
    return [];
  }

  return [...new Set(values.map((value) => formatter(String(value).trim())).filter(Boolean))];
}

function normalizeCoursePayload(body) {
  const branches = normalizeStringArray(body.branchTargets, (value) => value.toUpperCase());
  const semesters = normalizeStringArray(body.semesterTargets, (value) => Number(value)).filter((value) =>
    Number.isFinite(value)
  );
  const sections = normalizeStringArray(body.sectionTargets, (value) => value.toUpperCase());
  const batches = normalizeStringArray(body.batchTargets);
  const facultyIds = normalizeStringArray(body.facultyIds);

  return {
    code: body.code?.trim().toUpperCase() || "",
    title: body.title?.trim() || "",
    description: body.description?.trim() || "",
    audiences: branches.flatMap((branch) =>
      semesters.flatMap((semester) =>
        sections.flatMap((section) => batches.map((batch) => ({ branch, semester, section, batch })))
      )
    ),
    facultyIds
  };
}

async function buildCourseCard(client, courseId, currentUser) {
  const courseResult = await client.query(
    `
      SELECT id, code, title, description, is_active, created_at, updated_at
      FROM courses
      WHERE id = $1
    `,
    [courseId]
  );

  if (courseResult.rows.length === 0) {
    return null;
  }

  const audienceResult = await client.query(
    `
      SELECT branch, semester, section, batch
      FROM course_audiences
      WHERE course_id = $1
      ORDER BY branch, semester, section, batch
    `,
    [courseId]
  );
  const facultyResult = await client.query(
    `
      SELECT u.id, u.full_name, u.email
      FROM course_faculty cf
      JOIN users u ON u.id = cf.faculty_id
      WHERE cf.course_id = $1
      ORDER BY u.full_name ASC
    `,
    [courseId]
  );
  const countsResult = await client.query(
    `
      SELECT
        (SELECT COUNT(*)::int FROM course_assignments WHERE course_id = $1) AS assignment_count,
        (SELECT COUNT(*)::int FROM course_materials WHERE course_id = $1) AS materials_count,
        (SELECT COUNT(*)::int FROM course_coding_problems WHERE course_id = $1) AS coding_problems_count,
        (SELECT COUNT(*)::int FROM course_enrollments WHERE course_id = $1 AND status = 'enrolled') AS enrolled_count
    `,
    [courseId]
  );

  const audiences = audienceResult.rows;
  const branchTargets = [...new Set(audiences.map((row) => row.branch))];
  const semesterTargets = [...new Set(audiences.map((row) => row.semester))];
  const sectionTargets = [...new Set(audiences.map((row) => row.section))];
  const batchTargets = [...new Set(audiences.map((row) => row.batch))];
  const counts = countsResult.rows[0];

  return {
    id: courseId,
    code: courseResult.rows[0].code,
    title: courseResult.rows[0].title,
    description: courseResult.rows[0].description || "",
    branchTargets,
    semesterTargets,
    sectionTargets,
    batchTargets,
    faculty: facultyResult.rows.map((row) => ({
      id: row.id,
      fullName: row.full_name,
      email: row.email
    })),
    materialsCount: counts.materials_count,
    codingProblemsCount: counts.coding_problems_count,
    assignmentCount: counts.assignment_count,
    enrolledCount: counts.enrolled_count,
    isActive: courseResult.rows[0].is_active,
    canManage:
      currentUser?.role === "admin" ||
      facultyResult.rows.some((row) => row.id === currentUser?.id),
    createdAt: courseResult.rows[0].created_at,
    updatedAt: courseResult.rows[0].updated_at
  };
}

async function syncCourseRelations(client, courseId, audiences, facultyIds) {
  await client.query("DELETE FROM course_audiences WHERE course_id = $1", [courseId]);
  await client.query("DELETE FROM course_faculty WHERE course_id = $1", [courseId]);

  for (const audience of audiences) {
    await client.query(
      `
        INSERT INTO course_audiences (course_id, branch, semester, section, batch)
        VALUES ($1, $2, $3, $4, $5)
      `,
      [courseId, audience.branch, audience.semester, audience.section, audience.batch]
    );
  }

  for (const facultyId of facultyIds) {
    await client.query(
      `
        INSERT INTO course_faculty (course_id, faculty_id)
        VALUES ($1, $2)
      `,
      [courseId, facultyId]
    );
  }
}

async function syncCourseEnrollments(client, courseId) {
  const studentResult = await client.query(
    `
      SELECT DISTINCT sp.user_id
      FROM student_profiles sp
      JOIN course_audiences ca
        ON ca.branch = sp.branch
       AND ca.semester = sp.semester
       AND ca.section = sp.section
       AND ca.batch = sp.batch
      WHERE ca.course_id = $1
    `,
    [courseId]
  );

  const matchedStudentIds = studentResult.rows.map((row) => row.user_id);
  await client.query(
    `
      UPDATE course_enrollments
      SET status = 'archived', updated_at = NOW()
      WHERE course_id = $1
    `,
    [courseId]
  );

  for (const studentId of matchedStudentIds) {
    await client.query(
      `
        INSERT INTO course_enrollments (course_id, student_id, status)
        VALUES ($1, $2, 'enrolled')
        ON CONFLICT (course_id, student_id)
        DO UPDATE SET status = 'enrolled', updated_at = NOW()
      `,
      [courseId, studentId]
    );
  }
}

function mapAssignmentRow(row, includeSubmissionDetails = false) {
  return {
    id: row.id,
    title: row.title,
    description: row.description || "",
    type: row.assignment_type,
    dueDate: row.due_date,
    maxScore: row.max_score,
    submissionsCount: row.submissions_count ?? 0,
    createdAt: row.created_at,
    ...(includeSubmissionDetails ? { submissions: row.submissions || [] } : {})
  };
}

function normalizeCourseProblemExecutionPayload(body) {
  return {
    language: body.language?.trim()?.toLowerCase() || "",
    sourceCode: body.sourceCode?.trim() || ""
  };
}

function normalizeCourseProblemTestCases(rawCases) {
  if (!Array.isArray(rawCases)) {
    return [];
  }

  return rawCases
    .map((entry, index) => ({
      input_data: entry?.input_data ?? "",
      expected_output: entry?.expected_output ?? "",
      sort_order: typeof entry?.sort_order === "number" ? entry.sort_order : index
    }))
    .filter((entry) => entry.input_data.trim() || entry.expected_output.trim());
}

async function replaceCourseProblemTestCases(client, problemId, testCases, isSample) {
  await client.query("DELETE FROM course_problem_test_cases WHERE course_problem_id = $1 AND is_sample = $2", [
    problemId,
    isSample
  ]);

  for (const testCase of testCases) {
    await client.query(
      `
        INSERT INTO course_problem_test_cases (course_problem_id, input_data, expected_output, is_sample, sort_order)
        VALUES ($1, $2, $3, $4, $5)
      `,
      [problemId, testCase.input_data, testCase.expected_output, isSample, testCase.sort_order]
    );
  }
}

async function fetchCourseProblemTestCases(client, problemIds, includeHidden) {
  if (!problemIds.length) {
    return new Map();
  }

  const values = [problemIds];
  const hiddenFilter = includeHidden ? "" : "AND is_sample = TRUE";
  const result = await client.query(
    `
      SELECT id, course_problem_id, input_data, expected_output, is_sample, sort_order
      FROM course_problem_test_cases
      WHERE course_problem_id = ANY($1::uuid[])
      ${hiddenFilter}
      ORDER BY is_sample DESC, sort_order ASC, created_at ASC
    `,
    values
  );

  const map = new Map();
  result.rows.forEach((row) => {
    const entry = map.get(row.course_problem_id) || {
      sampleTestCases: [],
      hiddenTestCases: []
    };

    if (row.is_sample) {
      entry.sampleTestCases.push(row);
    } else {
      entry.hiddenTestCases.push(row);
    }

    map.set(row.course_problem_id, entry);
  });

  return map;
}

export const getCourseFilters = asyncHandler(async (_req, res) => {
  const [branchResult, sectionResult, batchResult, semesterResult, facultyResult] = await Promise.all([
    pool.query("SELECT DISTINCT branch FROM student_profiles ORDER BY branch ASC"),
    pool.query("SELECT DISTINCT section FROM student_profiles ORDER BY section ASC"),
    pool.query("SELECT DISTINCT batch FROM student_profiles ORDER BY batch ASC"),
    pool.query("SELECT DISTINCT semester FROM student_profiles ORDER BY semester ASC"),
    pool.query(
      `
        SELECT u.id, u.full_name, u.email
        FROM users u
        JOIN faculty_profiles fp ON fp.user_id = u.id
        WHERE u.role = 'faculty'
        ORDER BY u.full_name ASC
      `
    )
  ]);

  res.json({
    branches: branchResult.rows.map((row) => row.branch),
    sections: sectionResult.rows.map((row) => row.section),
    batches: batchResult.rows.map((row) => row.batch),
    semesters: semesterResult.rows.map((row) => row.semester),
    faculty: facultyResult.rows.map((row) => ({
      id: row.id,
      fullName: row.full_name,
      email: row.email
    }))
  });
});

export const createCourse = asyncHandler(async (req, res) => {
  const payload = normalizeCoursePayload(req.body);

  if (!payload.code || !payload.title || payload.audiences.length === 0 || payload.facultyIds.length === 0) {
    return res.status(400).json({
      message: "Course code, title, audience filters, and assigned faculty are required."
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const insertResult = await client.query(
      `
        INSERT INTO courses (code, title, description, instructor_id, is_active, updated_at)
        VALUES ($1, $2, $3, $4, TRUE, NOW())
        RETURNING id
      `,
      [payload.code, payload.title, payload.description, payload.facultyIds[0] || null]
    );

    const courseId = insertResult.rows[0].id;
    await syncCourseRelations(client, courseId, payload.audiences, payload.facultyIds);
    await syncCourseEnrollments(client, courseId);

    await client.query("COMMIT");

    res.status(201).json({
      message: "Course created successfully.",
      course: await buildCourseCard(client, courseId, req.currentUser)
    });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
});

export const updateCourse = asyncHandler(async (req, res) => {
  const payload = normalizeCoursePayload(req.body);

  if (!payload.code || !payload.title || payload.audiences.length === 0 || payload.facultyIds.length === 0) {
    return res.status(400).json({
      message: "Course code, title, audience filters, and assigned faculty are required."
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const updateResult = await client.query(
      `
        UPDATE courses
        SET code = $1,
            title = $2,
            description = $3,
            instructor_id = $4,
            updated_at = NOW()
        WHERE id = $5 AND is_active = TRUE
        RETURNING id
      `,
      [payload.code, payload.title, payload.description, payload.facultyIds[0] || null, req.params.courseId]
    );

    if (updateResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Course not found." });
    }

    await syncCourseRelations(client, req.params.courseId, payload.audiences, payload.facultyIds);
    await syncCourseEnrollments(client, req.params.courseId);
    await client.query("COMMIT");

    res.json({
      message: "Course updated successfully.",
      course: await buildCourseCard(client, req.params.courseId, req.currentUser)
    });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
});

export const deleteCourse = asyncHandler(async (req, res) => {
  const result = await pool.query(
    `
      UPDATE courses
      SET is_active = FALSE, updated_at = NOW()
      WHERE id = $1
      RETURNING id
    `,
    [req.params.courseId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ message: "Course not found." });
  }

  await pool.query(
    `
      UPDATE course_enrollments
      SET status = 'archived', updated_at = NOW()
      WHERE course_id = $1
    `,
    [req.params.courseId]
  );

  res.json({ message: "Course archived successfully." });
});

export const listCourses = asyncHandler(async (req, res) => {
  const search = req.query.search?.trim() ?? "";
  const values = [];
  const filters = ["c.is_active = TRUE"];

  if (req.currentUser.role === "faculty") {
    values.push(req.currentUser.id);
    filters.push(`EXISTS (SELECT 1 FROM course_faculty cf WHERE cf.course_id = c.id AND cf.faculty_id = $${values.length})`);
  }

  if (req.currentUser.role === "student" && req.roleProfile) {
    values.push(
      req.roleProfile.branch,
      req.roleProfile.semester,
      req.roleProfile.section,
      req.roleProfile.batch,
      req.currentUser.id
    );
    filters.push(
      `EXISTS (
        SELECT 1
        FROM course_audiences ca
        WHERE ca.course_id = c.id
          AND ca.branch = $${values.length - 4}
          AND ca.semester = $${values.length - 3}
          AND ca.section = $${values.length - 2}
          AND ca.batch = $${values.length - 1}
      )`
    );
    filters.push(
      `EXISTS (
        SELECT 1
        FROM course_enrollments ce
        WHERE ce.course_id = c.id
          AND ce.student_id = $${values.length}
          AND ce.status = 'enrolled'
      )`
    );
  }

  if (search) {
    values.push(`%${search}%`);
    filters.push(`(c.code ILIKE $${values.length} OR c.title ILIKE $${values.length} OR COALESCE(c.description, '') ILIKE $${values.length})`);
  }

  const result = await pool.query(
    `
      SELECT c.id
      FROM courses c
      WHERE ${filters.join(" AND ")}
      ORDER BY c.updated_at DESC, c.created_at DESC
    `,
    values
  );

  const client = await pool.connect();
  try {
    const courses = await Promise.all(
      result.rows.map((row) => buildCourseCard(client, row.id, req.currentUser))
    );
    res.json(courses);
  } finally {
    client.release();
  }
});

export const getCourseById = asyncHandler(async (req, res) => {
  const client = await pool.connect();

  try {
    const courseCard = await buildCourseCard(client, req.course.id, req.currentUser);

    const materialsResult = await client.query(
      `
        SELECT id, title, description, material_type AS type, url, created_at
        FROM course_materials
        WHERE course_id = $1
        ORDER BY created_at DESC
      `,
      [req.course.id]
    );
    const problemsResult = await client.query(
      `
        SELECT id, title, statement, input_format, output_format, constraints_text, examples_text, difficulty, created_at
        FROM course_coding_problems
        WHERE course_id = $1
        ORDER BY created_at DESC
      `,
      [req.course.id]
    );
    const assignmentsResult = await client.query(
      `
        SELECT
          a.id,
          a.title,
          a.description,
          a.assignment_type,
          a.due_date,
          a.max_score,
          a.created_at,
          COUNT(s.id)::int AS submissions_count
        FROM course_assignments a
        LEFT JOIN course_assignment_submissions s ON s.assignment_id = a.id
        WHERE a.course_id = $1
        GROUP BY a.id
        ORDER BY a.due_date ASC NULLS LAST, a.created_at DESC
      `,
      [req.course.id]
    );

    let students = [];
    if (req.currentUser.role === "faculty" || req.currentUser.role === "admin") {
      const studentResult = await client.query(
        `
          SELECT u.id, u.full_name, u.email
          FROM course_enrollments ce
          JOIN users u ON u.id = ce.student_id
          WHERE ce.course_id = $1 AND ce.status = 'enrolled'
          ORDER BY u.full_name ASC
        `,
        [req.course.id]
      );
      students = studentResult.rows.map((row) => ({
        id: row.id,
        fullName: row.full_name,
        email: row.email
      }));
    }

    let assignments = assignmentsResult.rows.map((row) => mapAssignmentRow(row));
    if (req.currentUser.role === "student" && assignments.length > 0) {
      const submissionResult = await client.query(
        `
          SELECT assignment_id, id, submitted_at, grade, feedback, status
          FROM course_assignment_submissions
          WHERE student_id = $1
            AND assignment_id = ANY($2::uuid[])
        `,
        [req.currentUser.id, assignments.map((assignment) => assignment.id)]
      );
      const submissionMap = new Map();
      submissionResult.rows.forEach((row) => {
        submissionMap.set(row.assignment_id, [
          {
            id: row.id,
            submittedAt: row.submitted_at,
            grade: row.grade,
            feedback: row.feedback,
            status: row.status
          }
        ]);
      });
      assignments = assignments.map((assignment) => ({
        ...assignment,
        submissions: submissionMap.get(assignment.id) || []
      }));
    }

    const includeHiddenCourseCases = req.currentUser.role === "admin" || req.currentUser.role === "faculty";
    const courseProblemTestCaseMap = await fetchCourseProblemTestCases(
      client,
      problemsResult.rows.map((row) => row.id),
      includeHiddenCourseCases
    );

    let codingProblems = problemsResult.rows.map((row) => {
      const testCases = courseProblemTestCaseMap.get(row.id) || {
        sampleTestCases: [],
        hiddenTestCases: []
      };

      return {
        ...row,
        sampleTestCases: testCases.sampleTestCases,
        hiddenTestCases: includeHiddenCourseCases ? testCases.hiddenTestCases : [],
        submissions: []
      };
    });

    if (codingProblems.length > 0) {
      const problemSubmissionResult = await client.query(
        `
          SELECT
            cps.id,
            cps.course_problem_id,
            cps.language,
            cps.source_code,
            cps.status,
            cps.passed_test_cases,
            cps.total_test_cases,
            cps.execution_time_ms,
            cps.memory_kb,
            cps.compiler_output,
            cps.submitted_at
          FROM course_problem_submissions cps
          WHERE cps.student_id = $1
            AND cps.course_problem_id = ANY($2::uuid[])
          ORDER BY cps.submitted_at DESC
        `,
        [req.currentUser.id, codingProblems.map((problem) => problem.id)]
      );

      const submissionMap = new Map();
      problemSubmissionResult.rows.forEach((row) => {
        const current = submissionMap.get(row.course_problem_id) || [];
        current.push({
          id: row.id,
          language: row.language,
          sourceCode: row.source_code,
          status: row.status,
          passedTestCases: row.passed_test_cases,
          totalTestCases: row.total_test_cases,
          executionTimeMs: row.execution_time_ms,
          memoryKb: row.memory_kb,
          compilerOutput: row.compiler_output,
          submittedAt: row.submitted_at
        });
        submissionMap.set(row.course_problem_id, current);
      });

      codingProblems = codingProblems.map((problem) => ({
        ...problem,
        submissions: submissionMap.get(problem.id) || []
      }));
    }

    res.json({
      course: {
        ...courseCard,
        materials: materialsResult.rows,
        codingProblems,
        assignments,
        students
      }
    });
  } finally {
    client.release();
  }
});

export const addCourseMaterial = asyncHandler(async (req, res) => {
  const { title, description, type, url } = req.body;

  if (!title?.trim() || !url?.trim()) {
    return res.status(400).json({ message: "Material title and URL are required." });
  }

  await pool.query(
    `
      INSERT INTO course_materials (course_id, title, description, material_type, url, uploaded_by)
      VALUES ($1, $2, $3, $4, $5, $6)
    `,
    [req.course.id, title.trim(), description?.trim() || "", type?.trim() || "notes", url.trim(), req.currentUser.id]
  );

  res.status(201).json({ message: "Study material uploaded successfully." });
});

export const addCourseCodingProblem = asyncHandler(async (req, res) => {
  const {
    title,
    statement,
    difficulty,
    inputFormat = "",
    outputFormat = "",
    constraintsText = "",
    examplesText = "",
    sampleTestCases = [],
    hiddenTestCases = []
  } = req.body;

  if (!title?.trim() || !statement?.trim()) {
    return res.status(400).json({ message: "Coding problem title and statement are required." });
  }

  const normalizedSampleTestCases = normalizeCourseProblemTestCases(sampleTestCases);
  const normalizedHiddenTestCases = normalizeCourseProblemTestCases(hiddenTestCases);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `
        INSERT INTO course_coding_problems (
          course_id,
          title,
          statement,
          input_format,
          output_format,
          constraints_text,
          examples_text,
          difficulty,
          created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `,
      [
        req.course.id,
        title.trim(),
        statement.trim(),
        inputFormat.trim() || null,
        outputFormat.trim() || null,
        constraintsText.trim() || null,
        examplesText.trim() || null,
        difficulty?.trim()?.toLowerCase() || "medium",
        req.currentUser.id
      ]
    );

    await replaceCourseProblemTestCases(client, result.rows[0].id, normalizedSampleTestCases, true);
    await replaceCourseProblemTestCases(client, result.rows[0].id, normalizedHiddenTestCases, false);

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  res.status(201).json({ message: "Coding problem created successfully." });
});

export const runCourseCodingProblem = asyncHandler(async (req, res) => {
  const payload = normalizeCourseProblemExecutionPayload(req.body);

  if (!payload.language || !payload.sourceCode) {
    return res.status(400).json({
      message: "Language and source code are required."
    });
  }

  const problemResult = await pool.query(
    `
      SELECT id
      FROM course_coding_problems
      WHERE id = $1 AND course_id = $2
    `,
    [req.params.problemId, req.course.id]
  );

  if (problemResult.rows.length === 0) {
    return res.status(404).json({ message: "Course coding problem not found." });
  }

  const sampleTestCaseResult = await pool.query(
    `
      SELECT id, input_data, expected_output, is_sample, sort_order
      FROM course_problem_test_cases
      WHERE course_problem_id = $1
        AND is_sample = TRUE
      ORDER BY sort_order ASC, created_at ASC
    `,
    [req.params.problemId]
  );

  const executionResult = await executeSubmission({
    language: payload.language,
    sourceCode: payload.sourceCode,
    testCases:
      sampleTestCaseResult.rows.length > 0
        ? sampleTestCaseResult.rows
        : [
            {
              id: "course-problem-run",
              input_data: "",
              expected_output: "",
              is_sample: true,
              sort_order: 0
            }
          ]
  });

  res.json({
    message: "Course problem code executed.",
    result: {
      ...executionResult,
      language: payload.language
    }
  });
});

export const submitCourseCodingProblem = asyncHandler(async (req, res) => {
  const payload = normalizeCourseProblemExecutionPayload(req.body);

  if (!payload.language || !payload.sourceCode) {
    return res.status(400).json({
      message: "Language and source code are required."
    });
  }

  const problemResult = await pool.query(
    `
      SELECT id
      FROM course_coding_problems
      WHERE id = $1 AND course_id = $2
    `,
    [req.params.problemId, req.course.id]
  );

  if (problemResult.rows.length === 0) {
    return res.status(404).json({ message: "Course coding problem not found." });
  }

  const allTestCaseResult = await pool.query(
    `
      SELECT id, input_data, expected_output, is_sample, sort_order
      FROM course_problem_test_cases
      WHERE course_problem_id = $1
      ORDER BY is_sample DESC, sort_order ASC, created_at ASC
    `,
    [req.params.problemId]
  );

  const executionResult = await executeSubmission({
    language: payload.language,
    sourceCode: payload.sourceCode,
    testCases:
      allTestCaseResult.rows.length > 0
        ? allTestCaseResult.rows
        : [
            {
              id: "course-problem-submit",
              input_data: "",
              expected_output: "",
              is_sample: true,
              sort_order: 0
            }
          ]
  });

  const result = await pool.query(
    `
      INSERT INTO course_problem_submissions (
        course_problem_id,
        student_id,
        language,
        source_code,
        status,
        passed_test_cases,
        total_test_cases,
        execution_time_ms,
        memory_kb,
        compiler_output
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING
        id,
        course_problem_id,
        student_id,
        language,
        source_code,
        status,
        passed_test_cases,
        total_test_cases,
        execution_time_ms,
        memory_kb,
        compiler_output,
        submitted_at
    `,
    [
      req.params.problemId,
      req.currentUser.id,
      payload.language,
      payload.sourceCode,
      executionResult.status,
      executionResult.passedTestCases,
      executionResult.totalTestCases,
      executionResult.executionTimeMs,
      executionResult.memoryKb,
      executionResult.compilerOutput
    ]
  );

  res.status(201).json({
    message: "Course problem submitted successfully.",
    submission: result.rows[0],
    execution: {
      errorType: executionResult.errorType ?? null,
      verdictLabel: executionResult.verdictLabel ?? result.rows[0].status,
      stdout: executionResult.stdout ?? "",
      stderr: executionResult.stderr ?? "",
      executionTimeMs: executionResult.executionTimeMs ?? 0
    },
    testCaseResults: executionResult.testCaseResults ?? []
  });
});

export const getCourseStudents = asyncHandler(async (req, res) => {
  const result = await pool.query(
    `
      SELECT u.id, u.full_name, u.email
      FROM course_enrollments ce
      JOIN users u ON u.id = ce.student_id
      WHERE ce.course_id = $1 AND ce.status = 'enrolled'
      ORDER BY u.full_name ASC
    `,
    [req.course.id]
  );

  res.json(
    result.rows.map((row) => ({
      id: row.id,
      fullName: row.full_name,
      email: row.email
    }))
  );
});
