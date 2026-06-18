import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
const TEMP_DIR_PREFIX = "coding-platform-";
const EXECUTION_TIMEOUT_MS = 2000;
const MAX_OUTPUT_LENGTH = 4000;

function normalizeOutput(output) {
  return (output ?? "").replace(/\r\n/g, "\n").trim();
}

function truncateOutput(output) {
  if (!output) {
    return "";
  }

  return output.length > MAX_OUTPUT_LENGTH ? `${output.slice(0, MAX_OUTPUT_LENGTH)}...` : output;
}

function buildFeedback({ stage, passedTestCases, totalTestCases, stdout = "", stderr = "" }) {
  const failedTestCases = Math.max(0, totalTestCases - passedTestCases);
  const parts = [
    `Stage: ${stage}`,
    `Passed: ${passedTestCases}/${totalTestCases}`,
    `Failed: ${failedTestCases}`
  ];

  if (stdout.trim()) {
    parts.push(`Stdout:\n${truncateOutput(stdout.trim())}`);
  }

  if (stderr.trim()) {
    parts.push(`Stderr:\n${truncateOutput(stderr.trim())}`);
  }

  return parts.join("\n\n");
}

function verdictLabelFromErrorType(errorType) {
  switch (errorType) {
    case "compile_error":
      return "Compile Error";
    case "runtime_error":
      return "Runtime Error";
    case "wrong_answer":
      return "Wrong Answer";
    case "time_limit":
      return "Time Limit Exceeded";
    default:
      return "Accepted";
  }
}

async function runProcess(command, args, { cwd, input = "", timeoutMs = EXECUTION_TIMEOUT_MS }) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const child = spawn(command, args, {
      cwd,
      stdio: "pipe"
    });
    let stdout = "";
    let stderr = "";
    let finished = false;
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      if (finished) {
        return;
      }

      finished = true;
      clearTimeout(timer);
      resolve({
        ok: false,
        stdout,
        stderr: `${stderr}${stderr ? "\n" : ""}${error.message}`,
        executionTimeMs: Date.now() - startedAt,
        timedOut,
        code: null
      });
    });

    child.on("close", (code) => {
      if (finished) {
        return;
      }

      finished = true;
      clearTimeout(timer);
      resolve({
        ok: !timedOut && code === 0,
        stdout,
        stderr,
        executionTimeMs: Date.now() - startedAt,
        timedOut,
        code
      });
    });

    if (input) {
      child.stdin.write(input);
    }

    child.stdin.end();
  });
}

async function prepareJavaScript(tempDir, sourceCode) {
  const filePath = path.join(tempDir, "solution.js");
  await writeFile(filePath, sourceCode, "utf8");

  return {
    command: "node",
    args: [filePath]
  };
}

async function preparePython(tempDir, sourceCode) {
  const filePath = path.join(tempDir, "solution.py");
  await writeFile(filePath, sourceCode, "utf8");

  return {
    command: "python",
    args: [filePath]
  };
}

async function prepareCpp(tempDir, sourceCode) {
  const sourcePath = path.join(tempDir, "main.cpp");
  const outputPath = path.join(tempDir, "main.exe");
  await writeFile(sourcePath, sourceCode, "utf8");

  const compileResult = await runProcess("g++", [sourcePath, "-O2", "-std=c++17", "-o", outputPath], {
    cwd: tempDir
  });

  if (!compileResult.ok) {
    return {
      compileError: buildFeedback({
        stage: "compile",
        passedTestCases: 0,
        totalTestCases: 0,
        stdout: compileResult.stdout,
        stderr: compileResult.stderr
      })
    };
  }

  return {
    command: outputPath,
    args: []
  };
}

async function prepareJava(tempDir, sourceCode) {
  const sourcePath = path.join(tempDir, "Main.java");
  await writeFile(sourcePath, sourceCode, "utf8");

  const compileResult = await runProcess("javac", [sourcePath], {
    cwd: tempDir
  });

  if (!compileResult.ok) {
    return {
      compileError: buildFeedback({
        stage: "compile",
        passedTestCases: 0,
        totalTestCases: 0,
        stdout: compileResult.stdout,
        stderr: compileResult.stderr
      })
    };
  }

  return {
    command: "java",
    args: ["-cp", tempDir, "Main"]
  };
}

async function prepareExecutable(tempDir, language, sourceCode) {
  switch (language) {
    case "javascript":
      return prepareJavaScript(tempDir, sourceCode);
    case "python":
      return preparePython(tempDir, sourceCode);
    case "cpp":
      return prepareCpp(tempDir, sourceCode);
    case "java":
      return prepareJava(tempDir, sourceCode);
    default:
      return {
        compileError: `Unsupported language: ${language}`
      };
  }
}

export async function executeSubmission({ language, sourceCode, testCases }) {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), TEMP_DIR_PREFIX));

  try {
    const executable = await prepareExecutable(tempDir, language, sourceCode);

    if (executable.compileError) {
      return {
        status: "wrong_answer",
        errorType: "compile_error",
        verdictLabel: verdictLabelFromErrorType("compile_error"),
        passedTestCases: 0,
        totalTestCases: testCases.length,
        executionTimeMs: 0,
        memoryKb: null,
        stdout: "",
        stderr: executable.compileError,
        compilerOutput: executable.compileError
      };
    }

    let passedTestCases = 0;
    let totalExecutionTimeMs = 0;
    const testCaseResults = [];

    const casesToRun =
      testCases.length > 0 ? testCases : [{ input_data: "", expected_output: "", id: "no-test-cases" }];

    for (const testCase of casesToRun) {
      const runResult = await runProcess(executable.command, executable.args, {
        cwd: tempDir,
        input: testCase.input_data ?? "",
        timeoutMs: EXECUTION_TIMEOUT_MS
      });

      totalExecutionTimeMs += runResult.executionTimeMs;

      if (runResult.timedOut) {
        testCaseResults.push({
          id: testCase.id,
          passed: false,
          input: testCase.input_data ?? "",
          expectedOutput: testCase.expected_output ?? "",
          actualOutput: normalizeOutput(runResult.stdout),
          stderr: runResult.stderr || "Execution timed out.",
          executionTimeMs: runResult.executionTimeMs,
          isSample: Boolean(testCase.is_sample)
        });

        return {
          status: "time_limit",
          errorType: "time_limit",
          verdictLabel: verdictLabelFromErrorType("time_limit"),
          passedTestCases,
          totalTestCases: testCases.length,
          executionTimeMs: totalExecutionTimeMs,
          memoryKb: null,
          stdout: runResult.stdout,
          stderr: runResult.stderr || "Execution timed out.",
          testCaseResults,
          compilerOutput: buildFeedback({
            stage: "run",
            passedTestCases,
            totalTestCases: testCases.length,
            stdout: runResult.stdout,
            stderr: runResult.stderr || "Execution timed out."
          })
        };
      }

      if (!runResult.ok) {
        testCaseResults.push({
          id: testCase.id,
          passed: false,
          input: testCase.input_data ?? "",
          expectedOutput: testCase.expected_output ?? "",
          actualOutput: normalizeOutput(runResult.stdout),
          stderr: runResult.stderr,
          executionTimeMs: runResult.executionTimeMs,
          isSample: Boolean(testCase.is_sample)
        });

        return {
          status: "wrong_answer",
          errorType: "runtime_error",
          verdictLabel: verdictLabelFromErrorType("runtime_error"),
          passedTestCases,
          totalTestCases: testCases.length,
          executionTimeMs: totalExecutionTimeMs,
          memoryKb: null,
          stdout: runResult.stdout,
          stderr: runResult.stderr,
          testCaseResults,
          compilerOutput: buildFeedback({
            stage: "run",
            passedTestCases,
            totalTestCases: testCases.length,
            stdout: runResult.stdout,
            stderr: runResult.stderr
          })
        };
      }

      const actualOutput = normalizeOutput(runResult.stdout);
      const expectedOutput = normalizeOutput(testCase.expected_output);

      if (actualOutput !== expectedOutput) {
        testCaseResults.push({
          id: testCase.id,
          passed: false,
          input: testCase.input_data ?? "",
          expectedOutput,
          actualOutput,
          stderr: runResult.stderr,
          executionTimeMs: runResult.executionTimeMs,
          isSample: Boolean(testCase.is_sample)
        });

        return {
          status: "wrong_answer",
          errorType: "wrong_answer",
          verdictLabel: verdictLabelFromErrorType("wrong_answer"),
          passedTestCases,
          totalTestCases: testCases.length,
          executionTimeMs: totalExecutionTimeMs,
          memoryKb: null,
          stdout: runResult.stdout,
          stderr: runResult.stderr,
          testCaseResults,
          compilerOutput: buildFeedback({
            stage: "run",
            passedTestCases,
            totalTestCases: testCases.length,
            stdout: `Expected:\n${expectedOutput || "(empty)"}\n\nActual:\n${actualOutput || "(empty)"}`,
            stderr: runResult.stderr
          })
        };
      }

      passedTestCases += 1;
      testCaseResults.push({
        id: testCase.id,
        passed: true,
        input: testCase.input_data ?? "",
        expectedOutput,
        actualOutput,
        stderr: runResult.stderr,
        executionTimeMs: runResult.executionTimeMs,
        isSample: Boolean(testCase.is_sample)
      });
    }

    return {
      status: "accepted",
      errorType: null,
      verdictLabel: verdictLabelFromErrorType(null),
      passedTestCases: testCases.length,
      totalTestCases: testCases.length,
      executionTimeMs: totalExecutionTimeMs,
      memoryKb: null,
      stdout: "All test cases passed.",
      stderr: "",
      testCaseResults,
      compilerOutput: buildFeedback({
        stage: "run",
        passedTestCases: testCases.length,
        totalTestCases: testCases.length,
        stdout: "All test cases passed."
      })
    };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}
