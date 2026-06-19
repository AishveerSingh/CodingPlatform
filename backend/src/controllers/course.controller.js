import { pool } from "../config/db.js";
import { asyncHandler } from "../utils/asyncHandler.js";

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
        SELECT id, title, statement, difficulty, created_at
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

    res.json({
      course: {
        ...courseCard,
        materials: materialsResult.rows,
        codingProblems: problemsResult.rows,
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
  const { title, statement, difficulty } = req.body;

  if (!title?.trim() || !statement?.trim()) {
    return res.status(400).json({ message: "Coding problem title and statement are required." });
  }

  await pool.query(
    `
      INSERT INTO course_coding_problems (course_id, title, statement, difficulty, created_by)
      VALUES ($1, $2, $3, $4, $5)
    `,
    [req.course.id, title.trim(), statement.trim(), difficulty?.trim()?.toLowerCase() || "medium", req.currentUser.id]
  );

  res.status(201).json({ message: "Coding problem created successfully." });
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
