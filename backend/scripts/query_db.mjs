import pg from "pg";
import dotenv from "dotenv";

dotenv.config({ path: new URL("../.env", import.meta.url) });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  const client = await pool.connect();
  try {
    const problem = await client.query(
      "SELECT * FROM problems WHERE id = '220399dd-600a-4fa4-8413-bd65e0e1c760'"
    );
    console.log("Pointer approach Problem:");
    console.log(problem.rows);

    const testCases = await client.query(
      "SELECT * FROM test_cases WHERE problem_id = '220399dd-600a-4fa4-8413-bd65e0e1c760'"
    );
    console.log("\nPointer approach Test Cases:");
    console.log(testCases.rows);
  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
