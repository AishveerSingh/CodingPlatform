import { env } from "../config/env.js";

const languageIds = {
  cpp: Number(env.judge0LanguageCpp) || 105,
  java: Number(env.judge0LanguageJava) || 91,
  javascript: Number(env.judge0LanguageJavascript) || 102,
  python: Number(env.judge0LanguagePython) || 92
};

function encodeBase64(str) {
  return Buffer.from(str ?? "", "utf8").toString("base64");
}

function decodeBase64(str) {
  if (!str) return "";
  return Buffer.from(str, "base64").toString("utf8");
}

function normalizeOutput(output) {
  return (output ?? "").replace(/\r\n/g, "\n").trim();
}

function truncateOutput(output, maxLength = 4000) {
  if (!output) return "";
  return output.length > maxLength ? `${output.slice(0, maxLength)}...` : output;
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

export async function executeSubmission({ language, sourceCode, testCases }) {
  const normalizedLanguage = language.trim().toLowerCase();
  const languageId = languageIds[normalizedLanguage];

  if (!languageId) {
    return {
      status: "wrong_answer",
      errorType: "compile_error",
      verdictLabel: "Unsupported Language",
      passedTestCases: 0,
      totalTestCases: testCases.length,
      executionTimeMs: 0,
      memoryKb: null,
      stdout: "",
      stderr: `Unsupported language: ${language}`,
      compilerOutput: `Unsupported language: ${language}`
    };
  }

  const casesToRun = testCases.length > 0
    ? testCases
    : [{ input_data: "", expected_output: "", id: "no-test-cases" }];

  // Prepare Judge0 headers
  const headers = {
    "Content-Type": "application/json"
  };
  if (env.judge0ApiKey) {
    headers["X-Auth-Token"] = env.judge0ApiKey;
    if (env.judge0ApiHost) {
      headers["X-RapidAPI-Key"] = env.judge0ApiKey;
      headers["X-RapidAPI-Host"] = env.judge0ApiHost;
    }
  }

  // 1. Submit batch request to Judge0
  const submissionsPayload = {
    submissions: casesToRun.map(tc => ({
      language_id: languageId,
      source_code: encodeBase64(sourceCode),
      stdin: encodeBase64(tc.input_data),
      expected_output: encodeBase64(tc.expected_output)
    }))
  };

  let tokens = [];
  try {
    const response = await fetch(`${env.judge0BaseUrl}/submissions/batch?base64_encoded=true`, {
      method: "POST",
      headers,
      body: JSON.stringify(submissionsPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Judge0 Submit Batch Error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    tokens = result.map(sub => sub.token);
  } catch (err) {
    console.error("Judge0 Submission creation failed:", err);
    return {
      status: "wrong_answer",
      errorType: "runtime_error",
      verdictLabel: "Internal Error",
      passedTestCases: 0,
      totalTestCases: casesToRun.length,
      executionTimeMs: 0,
      memoryKb: null,
      stdout: "",
      stderr: `Code execution infrastructure error: ${err.message}`,
      compilerOutput: `Code execution infrastructure error: ${err.message}`
    };
  }

  // 2. Poll Judge0 until all submissions are finished (status.id > 2)
  let attempts = 0;
  const maxAttempts = env.judge0MaxPollAttempts || 20;
  const interval = env.judge0PollIntervalMs || 500;
  let batchResults = [];

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, interval));
    attempts++;

    try {
      const response = await fetch(`${env.judge0BaseUrl}/submissions/batch?tokens=${tokens.join(",")}&base64_encoded=true`, {
        method: "GET",
        headers
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Judge0 Poll Batch Error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      batchResults = data.submissions || [];

      // Check if all submissions finished processing (status.id > 2)
      const allFinished = batchResults.every(sub => sub.status && sub.status.id > 2);
      if (allFinished) {
        break;
      }
    } catch (err) {
      console.error("Judge0 Polling failed:", err);
    }
  }

  if (batchResults.length === 0) {
    return {
      status: "wrong_answer",
      errorType: "runtime_error",
      verdictLabel: "Execution Timeout",
      passedTestCases: 0,
      totalTestCases: casesToRun.length,
      executionTimeMs: 0,
      memoryKb: null,
      stdout: "",
      stderr: "Judge0 polling timed out or failed to return results.",
      compilerOutput: "Judge0 polling timed out or failed to return results."
    };
  }

  // 3. Process outcomes
  let passedTestCases = 0;
  let totalExecutionTimeMs = 0;
  let maxMemoryKb = 0;
  const testCaseResults = [];

  let overallErrorType = null;
  let overallStatus = "accepted";
  let firstFailedSubmission = null;

  for (let i = 0; i < casesToRun.length; i++) {
    const testCase = casesToRun[i];
    const subResult = batchResults[i] || { status: { id: 13, description: "Internal Error" } };

    const statusId = subResult.status ? subResult.status.id : 13;
    const timeMs = Math.round((parseFloat(subResult.time) || 0) * 1000);
    const memoryKb = parseInt(subResult.memory) || 0;

    totalExecutionTimeMs += timeMs;
    if (memoryKb > maxMemoryKb) {
      maxMemoryKb = memoryKb;
    }

    const stdout = normalizeOutput(decodeBase64(subResult.stdout));
    const stderr = decodeBase64(subResult.stderr || subResult.message);
    const compileOutput = decodeBase64(subResult.compile_output);

    let passed = false;
    let testCaseErrorType = null;

    if (statusId === 3) {
      passed = true;
      passedTestCases++;
    } else if (statusId === 4) {
      testCaseErrorType = "wrong_answer";
    } else if (statusId === 5) {
      testCaseErrorType = "time_limit";
    } else if (statusId === 6) {
      testCaseErrorType = "compile_error";
    } else {
      testCaseErrorType = "runtime_error";
    }

    testCaseResults.push({
      id: testCase.id,
      passed,
      input: testCase.input_data ?? "",
      expectedOutput: normalizeOutput(testCase.expected_output),
      actualOutput: stdout,
      stderr: stderr || compileOutput || (passed ? "" : subResult.status.description),
      executionTimeMs: timeMs,
      isSample: Boolean(testCase.is_sample)
    });

    if (!passed && !firstFailedSubmission) {
      firstFailedSubmission = {
        errorType: testCaseErrorType,
        stdout,
        stderr,
        compileOutput,
        statusDescription: subResult.status.description
      };
    }
  }

  if (firstFailedSubmission) {
    const { errorType, stdout, stderr, compileOutput, statusDescription } = firstFailedSubmission;
    overallErrorType = errorType;

    if (errorType === "compile_error") {
      overallStatus = "wrong_answer";
      const fullCompilerOutput = compileOutput || stderr || statusDescription;
      return {
        status: "wrong_answer",
        errorType: "compile_error",
        verdictLabel: "Compile Error",
        passedTestCases: 0,
        totalTestCases: casesToRun.length,
        executionTimeMs: 0,
        memoryKb: null,
        stdout: "",
        stderr: fullCompilerOutput,
        testCaseResults,
        compilerOutput: fullCompilerOutput
      };
    } else if (errorType === "time_limit") {
      overallStatus = "time_limit";
    } else {
      overallStatus = "wrong_answer";
    }


    const finalFeedback = buildFeedback({
      stage: "run",
      passedTestCases,
      totalTestCases: casesToRun.length,
      stdout: overallErrorType === "wrong_answer"
        ? `Expected:\n${testCaseResults.find(r => !r.passed)?.expectedOutput || ""}\n\nActual:\n${testCaseResults.find(r => !r.passed)?.actualOutput || ""}`
        : stdout,
      stderr: stderr || compileOutput || statusDescription
    });

    return {
      status: overallStatus,
      errorType: overallErrorType,
      verdictLabel: verdictLabelFromErrorType(overallErrorType),
      passedTestCases,
      totalTestCases: casesToRun.length,
      executionTimeMs: totalExecutionTimeMs,
      memoryKb: maxMemoryKb || null,
      stdout,
      stderr: stderr || compileOutput || statusDescription,
      testCaseResults,
      compilerOutput: finalFeedback
    };
  }

  return {
    status: "accepted",
    errorType: null,
    verdictLabel: "Accepted",
    passedTestCases: casesToRun.length,
    totalTestCases: casesToRun.length,
    executionTimeMs: totalExecutionTimeMs,
    memoryKb: maxMemoryKb || null,
    stdout: "All test cases passed.",
    stderr: "",
    testCaseResults,
    compilerOutput: buildFeedback({
      stage: "run",
      passedTestCases: casesToRun.length,
      totalTestCases: casesToRun.length,
      stdout: "All test cases passed."
    })
  };
}
