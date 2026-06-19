import { pool } from "../config/db.js";
import { logAdminAction } from "../utils/adminLog.js";
import { verifyAuthToken } from "../utils/auth.js";

function normalizeTags(rawTags) {
  if (!Array.isArray(rawTags)) {
    return [];
  }

  return [...new Set(rawTags.map((tag) => tag?.trim().toLowerCase()).filter(Boolean))];
}

function normalizeTestCases(rawCases) {
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

async function replaceProblemTags(client, problemId, tags) {
  await client.query("DELETE FROM problem_tags WHERE problem_id = $1", [problemId]);

  for (const tag of tags) {
    await client.query(
      `
        INSERT INTO problem_tags (problem_id, tag_name)
        VALUES ($1, $2)
      `,
      [problemId, tag]
    );
  }
}

async function replaceTestCases(client, problemId, testCases, isSample) {
  await client.query("DELETE FROM test_cases WHERE problem_id = $1 AND is_sample = $2", [
    problemId,
    isSample
  ]);

  for (const testCase of testCases) {
    await client.query(
      `
        INSERT INTO test_cases (problem_id, input_data, expected_output, is_sample, sort_order)
        VALUES ($1, $2, $3, $4, $5)
      `,
      [problemId, testCase.input_data, testCase.expected_output, isSample, testCase.sort_order]
    );
  }
}

async function fetchProblemMetadata(client, problemId, includeHidden = false) {
  const queries = [
    client.query(
      `
        SELECT tag_name
        FROM problem_tags
        WHERE problem_id = $1
        ORDER BY tag_name ASC
      `,
      [problemId]
    ),
    client.query(
      `
        SELECT id, input_data, expected_output, sort_order
        FROM test_cases
        WHERE problem_id = $1 AND is_sample = TRUE
        ORDER BY sort_order ASC, created_at ASC
      `,
      [problemId]
    )
  ];

  if (includeHidden) {
    queries.push(
      client.query(
        `
          SELECT id, input_data, expected_output, sort_order
          FROM test_cases
          WHERE problem_id = $1 AND is_sample = FALSE
          ORDER BY sort_order ASC, created_at ASC
        `,
        [problemId]
      )
    );
  }

  const results = await Promise.all(queries);

  return {
    tags: results[0].rows.map((row) => row.tag_name),
    sample_test_cases: results[1].rows,
    hidden_test_cases: includeHidden ? results[2].rows : []
  };
}

export async function getProblems(req, res, next) {
  const search = req.query.q?.trim() ?? "";
  const difficulty = req.query.difficulty?.trim().toLowerCase() ?? "";

  if (difficulty && !["easy", "medium", "hard"].includes(difficulty)) {
    return res.status(400).json({
      message: "Difficulty filter must be easy, medium, or hard."
    });
  }

  try {
    const values = [];
    const filters = [];

    if (search) {
      values.push(`%${search}%`);
      filters.push(`(p.title ILIKE $${values.length} OR p.statement ILIKE $${values.length})`);
    }

    if (difficulty) {
      values.push(difficulty);
      filters.push(`p.difficulty = $${values.length}`);
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";
    const result = await pool.query(
      `
        SELECT
          p.id,
          p.title,
          p.difficulty,
          p.statement,
          p.input_format,
          p.output_format,
          p.constraints_text,
          p.examples_text,
          p.created_at,
          COALESCE(ARRAY_REMOVE(ARRAY_AGG(DISTINCT pt.tag_name), NULL), '{}') AS tags,
          COUNT(tc.id) FILTER (WHERE tc.is_sample = TRUE)::int AS sample_test_case_count
        FROM problems p
        LEFT JOIN problem_tags pt ON pt.problem_id = p.id
        LEFT JOIN test_cases tc ON tc.problem_id = p.id
        ${whereClause}
        GROUP BY p.id
        ORDER BY
          CASE p.difficulty
            WHEN 'easy' THEN 1
            WHEN 'medium' THEN 2
            WHEN 'hard' THEN 3
            ELSE 4
          END,
          p.created_at DESC
      `,
      values
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
}

export async function getProblemById(req, res, next) {
  const { problemId } = req.params;

  try {
    const result = await pool.query(
      `
        SELECT id, title, difficulty, statement, input_format, output_format, constraints_text, examples_text, created_at
        FROM problems
        WHERE id = $1
      `,
      [problemId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Coding question not found."
      });
    }

    let isAdmin = false;
    const authorizationHeader = req.headers.authorization;
    if (authorizationHeader?.startsWith("Bearer ")) {
      const token = authorizationHeader.slice("Bearer ".length).trim();
      try {
        const payload = verifyAuthToken(token);
        if (payload?.role === "admin") {
          isAdmin = true;
        }
      } catch (_err) {}
    }

    const metadata = await fetchProblemMetadata(pool, problemId, isAdmin);
    res.json({
      ...result.rows[0],
      ...metadata
    });
  } catch (error) {
    next(error);
  }
}

export async function createProblem(req, res, next) {
  const {
    title,
    difficulty,
    statement,
    inputFormat = "",
    outputFormat = "",
    constraintsText = "",
    examplesText = "",
    tags = [],
    sampleTestCases = [],
    hiddenTestCases = []
  } = req.body;

  if (!title?.trim() || !difficulty?.trim() || !statement?.trim()) {
    return res.status(400).json({
      message: "Title, difficulty, and statement are required."
    });
  }

  if (!["easy", "medium", "hard"].includes(difficulty)) {
    return res.status(400).json({
      message: "Difficulty must be easy, medium, or hard."
    });
  }

  const normalizedTags = normalizeTags(tags);
  const normalizedSampleTestCases = normalizeTestCases(sampleTestCases);
  const normalizedHiddenTestCases = normalizeTestCases(hiddenTestCases);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `
        INSERT INTO problems (
          title,
          difficulty,
          statement,
          input_format,
          output_format,
          constraints_text,
          examples_text
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, title, difficulty, statement, input_format, output_format, constraints_text, examples_text, created_at
      `,
      [
        title.trim(),
        difficulty.trim().toLowerCase(),
        statement.trim(),
        inputFormat.trim() || null,
        outputFormat.trim() || null,
        constraintsText.trim() || null,
        examplesText.trim() || null
      ]
    );

    const problem = result.rows[0];

    await replaceProblemTags(client, problem.id, normalizedTags);
    await replaceTestCases(client, problem.id, normalizedSampleTestCases, true);
    await replaceTestCases(client, problem.id, normalizedHiddenTestCases, false);

    await logAdminAction({
      db: client,
      adminId: req.auth?.userId,
      actionType: "problem_created",
      targetType: "problem",
      targetId: problem.id,
      details: {
        title: problem.title,
        tag_count: normalizedTags.length,
        sample_test_case_count: normalizedSampleTestCases.length,
        hidden_test_case_count: normalizedHiddenTestCases.length
      }
    });

    await client.query("COMMIT");

    const metadata = await fetchProblemMetadata(pool, problem.id, true);
    res.status(201).json({
      message: "Coding question added successfully.",
      problem: {
        ...problem,
        ...metadata
      }
    });
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
  }
}

export async function updateProblem(req, res, next) {
  const { problemId } = req.params;
  const {
    title,
    difficulty,
    statement,
    inputFormat = "",
    outputFormat = "",
    constraintsText = "",
    examplesText = "",
    tags = [],
    sampleTestCases = [],
    hiddenTestCases = []
  } = req.body;

  if (!title?.trim() || !difficulty?.trim() || !statement?.trim()) {
    return res.status(400).json({
      message: "Title, difficulty, and statement are required."
    });
  }

  if (!["easy", "medium", "hard"].includes(difficulty.trim().toLowerCase())) {
    return res.status(400).json({
      message: "Difficulty must be easy, medium, or hard."
    });
  }

  const normalizedTags = normalizeTags(tags);
  const normalizedSampleTestCases = normalizeTestCases(sampleTestCases);
  const normalizedHiddenTestCases = normalizeTestCases(hiddenTestCases);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `
        UPDATE problems
        SET
          title = $1,
          difficulty = $2,
          statement = $3,
          input_format = $4,
          output_format = $5,
          constraints_text = $6,
          examples_text = $7
        WHERE id = $8
        RETURNING id, title, difficulty, statement, input_format, output_format, constraints_text, examples_text, created_at
      `,
      [
        title.trim(),
        difficulty.trim().toLowerCase(),
        statement.trim(),
        inputFormat.trim() || null,
        outputFormat.trim() || null,
        constraintsText.trim() || null,
        examplesText.trim() || null,
        problemId
      ]
    );

    if (result.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        message: "Coding question not found."
      });
    }

    const problem = result.rows[0];
    await replaceProblemTags(client, problemId, normalizedTags);
    await replaceTestCases(client, problemId, normalizedSampleTestCases, true);
    await replaceTestCases(client, problemId, normalizedHiddenTestCases, false);

    await logAdminAction({
      db: client,
      adminId: req.auth?.userId,
      actionType: "problem_updated",
      targetType: "problem",
      targetId: problemId,
      details: {
        title: problem.title,
        tag_count: normalizedTags.length,
        sample_test_case_count: normalizedSampleTestCases.length,
        hidden_test_case_count: normalizedHiddenTestCases.length
      }
    });

    await client.query("COMMIT");

    const metadata = await fetchProblemMetadata(pool, problemId, true);
    res.json({
      message: "Coding question updated successfully.",
      problem: {
        ...problem,
        ...metadata
      }
    });
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
  }
}

export async function deleteProblem(req, res, next) {
  const { problemId } = req.params;

  try {
    const result = await pool.query(
      `
        DELETE FROM problems
        WHERE id = $1
        RETURNING id, title
      `,
      [problemId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Coding question not found."
      });
    }

    await logAdminAction({
      adminId: req.auth?.userId,
      actionType: "problem_deleted",
      targetType: "problem",
      targetId: result.rows[0].id,
      details: {
        title: result.rows[0].title
      }
    });

    res.json({
      message: "Coding question deleted successfully."
    });
  } catch (error) {
    next(error);
  }
}
