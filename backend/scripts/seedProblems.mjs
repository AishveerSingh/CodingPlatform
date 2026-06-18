import dotenv from "dotenv";
import pg from "pg";

dotenv.config({ path: new URL("../.env", import.meta.url) });

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: false } : false
});

const problems = [
  {
    title: "Sum of Two Numbers",
    difficulty: "easy",
    statement:
      "You are given two integers a and b. Print their sum.",
    inputFormat:
      "A single line containing two space-separated integers a and b.",
    outputFormat:
      "Print one integer, the sum of a and b.",
    constraintsText:
      "-10^9 <= a, b <= 10^9",
    examplesText:
      "If the input is 7 8, then the output should be 15 because 7 + 8 = 15.",
    tags: ["math", "implementation"],
    testCases: [
      { input: "7 8", output: "15", isSample: true },
      { input: "-5 9", output: "4", isSample: true },
      { input: "100 200", output: "300", isSample: false },
      { input: "0 0", output: "0", isSample: false }
    ]
  },
  {
    title: "Factorial of a Number",
    difficulty: "easy",
    statement:
      "Given a non-negative integer n, print n! (n factorial).",
    inputFormat:
      "A single line containing one integer n.",
    outputFormat:
      "Print one integer representing n factorial.",
    constraintsText:
      "0 <= n <= 12",
    examplesText:
      "For n = 5, factorial is 5 * 4 * 3 * 2 * 1 = 120.",
    tags: ["math", "loops"],
    testCases: [
      { input: "5", output: "120", isSample: true },
      { input: "0", output: "1", isSample: true },
      { input: "7", output: "5040", isSample: false },
      { input: "10", output: "3628800", isSample: false }
    ]
  },
  {
    title: "Nth Fibonacci Number",
    difficulty: "medium",
    statement:
      "Given n, print the nth Fibonacci number using zero-based indexing where F(0)=0 and F(1)=1.",
    inputFormat:
      "A single line containing one integer n.",
    outputFormat:
      "Print the nth Fibonacci number.",
    constraintsText:
      "0 <= n <= 30",
    examplesText:
      "If n = 6, the Fibonacci sequence is 0 1 1 2 3 5 8, so the answer is 8.",
    tags: ["dp", "math", "iteration"],
    testCases: [
      { input: "6", output: "8", isSample: true },
      { input: "1", output: "1", isSample: true },
      { input: "0", output: "0", isSample: false },
      { input: "10", output: "55", isSample: false }
    ]
  },
  {
    title: "Palindrome String Check",
    difficulty: "medium",
    statement:
      "Given a single lowercase string s, print YES if it is a palindrome, otherwise print NO.",
    inputFormat:
      "A single line containing one lowercase string s without spaces.",
    outputFormat:
      "Print YES if the string is a palindrome. Otherwise print NO.",
    constraintsText:
      "1 <= length of s <= 1000",
    examplesText:
      "For s = level, the answer is YES because it reads the same from left to right and right to left.",
    tags: ["strings", "two-pointers"],
    testCases: [
      { input: "level", output: "YES", isSample: true },
      { input: "coding", output: "NO", isSample: true },
      { input: "madam", output: "YES", isSample: false },
      { input: "abca", output: "NO", isSample: false }
    ]
  }
];

async function upsertProblem(client, problem) {
  const existingResult = await client.query(
    `
      SELECT id
      FROM problems
      WHERE title = $1
      LIMIT 1
    `,
    [problem.title]
  );

  let problemId;

  if (existingResult.rows.length > 0) {
    problemId = existingResult.rows[0].id;

    await client.query(
      `
        UPDATE problems
        SET
          difficulty = $1,
          statement = $2,
          input_format = $3,
          output_format = $4,
          constraints_text = $5,
          examples_text = $6
        WHERE id = $7
      `,
      [
        problem.difficulty,
        problem.statement,
        problem.inputFormat,
        problem.outputFormat,
        problem.constraintsText,
        problem.examplesText,
        problemId
      ]
    );
  } else {
    const insertResult = await client.query(
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
        RETURNING id
      `,
      [
        problem.title,
        problem.difficulty,
        problem.statement,
        problem.inputFormat,
        problem.outputFormat,
        problem.constraintsText,
        problem.examplesText
      ]
    );

    problemId = insertResult.rows[0].id;
  }

  await client.query("DELETE FROM problem_tags WHERE problem_id = $1", [problemId]);
  await client.query("DELETE FROM test_cases WHERE problem_id = $1", [problemId]);

  for (const tag of problem.tags) {
    await client.query(
      `
        INSERT INTO problem_tags (problem_id, tag_name)
        VALUES ($1, $2)
      `,
      [problemId, tag]
    );
  }

  for (const [index, testCase] of problem.testCases.entries()) {
    await client.query(
      `
        INSERT INTO test_cases (
          problem_id,
          input_data,
          expected_output,
          is_sample,
          sort_order
        )
        VALUES ($1, $2, $3, $4, $5)
      `,
      [problemId, testCase.input, testCase.output, testCase.isSample, index]
    );
  }
}

async function seedProblems() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    for (const problem of problems) {
      await upsertProblem(client, problem);
    }

    await client.query("COMMIT");
    console.log(`Seeded ${problems.length} problems with sample and hidden test cases.`);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Problem seeding failed:", error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

seedProblems();
