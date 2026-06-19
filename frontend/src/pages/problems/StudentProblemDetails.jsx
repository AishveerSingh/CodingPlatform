import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getAuthHeaders, getStudentSession } from "../../utils/session";

const apiBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const initialEditor = {
  language: "python",
  sourceCode: ""
};
const editorDraftStorageKey = "coding_platform_problem_drafts";
const problemTimerStorageKey = "coding_platform_problem_timers";
const initialTimerState = {
  isRunning: false,
  startedAt: 0,
  elapsedBeforePause: 0
};
const initialToastState = {
  visible: false,
  type: "success",
  title: "",
  message: ""
};
const pairedCharacters = {
  "(": ")",
  "{": "}",
  "[": "]",
  '"': '"',
  "'": "'"
};
const languageSuggestions = {
  python: [
    { label: "def", insertText: "def function_name():\n    " },
    { label: "for", insertText: "for    in    :\n    " },
    { label: "if", insertText: "if condition:\n    " },
    { label: "elif", insertText: "elif condition:\n    " },
    { label: "else", insertText: "else:\n    " },
    { label: "while", insertText: "while condition:\n    " },
    { label: "class", insertText: "class Solution:\n    def __init__(self):\n        " },
    { label: "return", insertText: "return " },
    { label: "print", insertText: "print()" },
    { label: "range", insertText: "range()" }
  ],
  javascript: [
    { label: "function", insertText: "function name() {\n  \n}" },
    { label: "const", insertText: "const " },
    { label: "let", insertText: "let " },
    { label: "for", insertText: "for (let i = 0; i < length; i += 1) {\n  \n}" },
    { label: "if", insertText: "if () {\n  \n}" },
    { label: "else", insertText: "else {\n  \n}" },
    { label: "while", insertText: "while () {\n  \n}" },
    { label: "return", insertText: "return " },
    { label: "console", insertText: "console.log();" },
    { label: "class", insertText: "class Solution {\n  constructor() {\n    \n  }\n}" }
  ],
  java: [
    { label: "main", insertText: "public class Main {\n    public static void main(String[] args) {\n        \n    }\n}" },
    { label: "for", insertText: "for (int i = 0; i < n; i++) {\n    \n}" },
    { label: "if", insertText: "if () {\n    \n}" },
    { label: "else", insertText: "else {\n    \n}" },
    { label: "while", insertText: "while () {\n    \n}" },
    { label: "return", insertText: "return " },
    { label: "System", insertText: "System.out.println();" },
    { label: "class", insertText: "class Solution {\n    \n}" }
  ],
  cpp: [
    { label: "include", insertText: "#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    \n    return 0;\n}" },
    { label: "for", insertText: "for (int i = 0; i < n; i++) {\n    \n}" },
    { label: "if", insertText: "if () {\n    \n}" },
    { label: "else", insertText: "else {\n    \n}" },
    { label: "while", insertText: "while () {\n    \n}" },
    { label: "return", insertText: "return " },
    { label: "cout", insertText: "cout <<  << endl;" },
    { label: "vector", insertText: "vector<int> " }
  ]
};
const syntaxKeywords = {
  python: [
    "and",
    "as",
    "break",
    "class",
    "continue",
    "def",
    "elif",
    "else",
    "False",
    "for",
    "from",
    "if",
    "import",
    "in",
    "is",
    "lambda",
    "None",
    "not",
    "or",
    "pass",
    "print",
    "return",
    "True",
    "while"
  ],
  javascript: [
    "break",
    "case",
    "catch",
    "class",
    "const",
    "continue",
    "else",
    "export",
    "for",
    "function",
    "if",
    "import",
    "let",
    "new",
    "return",
    "switch",
    "try",
    "while"
  ],
  java: [
    "class",
    "else",
    "for",
    "if",
    "import",
    "int",
    "new",
    "private",
    "public",
    "return",
    "static",
    "String",
    "void",
    "while"
  ],
  cpp: [
    "auto",
    "class",
    "const",
    "cout",
    "else",
    "for",
    "if",
    "include",
    "int",
    "return",
    "string",
    "using",
    "vector",
    "while"
  ]
};

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function readStoredObject(storageKey) {
  try {
    const storedValue = localStorage.getItem(storageKey);

    if (!storedValue) {
      return {};
    }

    const parsedValue = JSON.parse(storedValue);
    return parsedValue && typeof parsedValue === "object" ? parsedValue : {};
  } catch (_error) {
    return {};
  }
}

function getSolvedTimeStorageKey(problemId) {
  return `coding_platform_problem_solved_${problemId}`;
}

function highlightCode(sourceCode, language) {
  const source = sourceCode || "";
  const stringPattern = /("([^"\\]|\\.)*"|'([^'\\]|\\.)*')/g;
  const numberPattern = /\b\d+(\.\d+)?\b/g;
  const commentPattern =
    language === "python" ? /#[^\n]*/g : /\/\/[^\n]*|\/\*[\s\S]*?\*\//g;
  const keywordPattern = new RegExp(`\\b(${(syntaxKeywords[language] || []).join("|")})\\b`, "g");
  const tokenPatterns = [
    { pattern: commentPattern, className: "token-comment" },
    { pattern: stringPattern, className: "token-string" },
    { pattern: keywordPattern, className: "token-keyword" },
    { pattern: numberPattern, className: "token-number" }
  ];
  const matches = [];

  tokenPatterns.forEach(({ pattern, className }) => {
    for (const match of source.matchAll(pattern)) {
      if (match.index === undefined) {
        continue;
      }

      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        className,
        value: match[0]
      });
    }
  });

  matches.sort((firstMatch, secondMatch) => {
    if (firstMatch.start !== secondMatch.start) {
      return firstMatch.start - secondMatch.start;
    }

    return secondMatch.end - firstMatch.end;
  });

  const filteredMatches = [];
  let lastTokenEnd = -1;

  matches.forEach((match) => {
    if (match.start < lastTokenEnd) {
      return;
    }

    filteredMatches.push(match);
    lastTokenEnd = match.end;
  });

  let highlightedCode = "";
  let lastIndex = 0;

  filteredMatches.forEach((match) => {
    highlightedCode += escapeHtml(source.slice(lastIndex, match.start));
    highlightedCode += `<span class="${match.className}">${escapeHtml(match.value)}</span>`;
    lastIndex = match.end;
  });

  highlightedCode += escapeHtml(source.slice(lastIndex));
  return highlightedCode;
}

function getWordStart(value, cursorPosition) {
  let index = cursorPosition;

  while (index > 0 && /[A-Za-z_]/.test(value[index - 1])) {
    index -= 1;
  }

  return index;
}

function buildSuggestions(sourceCode, cursorPosition, language) {
  const wordStart = getWordStart(sourceCode, cursorPosition);
  const currentToken = sourceCode.slice(wordStart, cursorPosition);

  if (!currentToken.trim()) {
    return {
      currentToken: "",
      wordStart,
      matches: []
    };
  }

  const normalizedToken = currentToken.toLowerCase();
  const matches = (languageSuggestions[language] || []).filter((entry) =>
    entry.label.toLowerCase().startsWith(normalizedToken)
  );

  return {
    currentToken,
    wordStart,
    matches
  };
}

function getCaretCoordinates(textarea, cursorPosition) {
  if (!textarea) {
    return { top: 16, left: 16 };
  }

  const computedStyle = window.getComputedStyle(textarea);
  const mirror = document.createElement("div");

  mirror.style.position = "absolute";
  mirror.style.visibility = "hidden";
  mirror.style.pointerEvents = "none";
  mirror.style.whiteSpace = "pre-wrap";
  mirror.style.wordBreak = "break-word";
  mirror.style.overflowWrap = "break-word";
  mirror.style.boxSizing = "border-box";
  mirror.style.left = "-9999px";
  mirror.style.top = "0";
  mirror.style.width = `${textarea.clientWidth}px`;
  mirror.style.fontFamily = computedStyle.fontFamily;
  mirror.style.fontSize = computedStyle.fontSize;
  mirror.style.fontWeight = computedStyle.fontWeight;
  mirror.style.letterSpacing = computedStyle.letterSpacing;
  mirror.style.lineHeight = computedStyle.lineHeight;
  mirror.style.padding = computedStyle.padding;
  mirror.style.border = computedStyle.border;

  mirror.textContent = textarea.value.slice(0, cursorPosition);

  const marker = document.createElement("span");
  marker.textContent = textarea.value[cursorPosition] || " ";
  mirror.appendChild(marker);
  document.body.appendChild(mirror);

  const coordinates = {
    top: marker.offsetTop - textarea.scrollTop + marker.offsetHeight + 8,
    left: marker.offsetLeft - textarea.scrollLeft
  };

  document.body.removeChild(mirror);
  return coordinates;
}

function formatExecutionMessage(result, successMessage) {
  if (!result) {
    return successMessage;
  }

  if (result.status === "accepted") {
    return successMessage;
  }

  return result.verdictLabel || result.status.replaceAll("_", " ");
}

export default function StudentProblemDetails() {
  const { problemId } = useParams();
  const session = getStudentSession();
  const student = session?.user;
  const editorRef = useRef(null);
  const highlightRef = useRef(null);
  const lineNumbersRef = useRef(null);
  const [problem, setProblem] = useState(null);
  const [status, setStatus] = useState({
    loading: true,
    error: ""
  });
  const [consoleTab, setConsoleTab] = useState("results");
  const [editor, setEditor] = useState(initialEditor);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionMessage, setSubmissionMessage] = useState("");
  const [latestExecutionDetails, setLatestExecutionDetails] = useState("");
  const [latestSubmitResults, setLatestSubmitResults] = useState([]);
  const [latestSubmitExecution, setLatestSubmitExecution] = useState(null);
  const [runMessage, setRunMessage] = useState("");
  const [runResults, setRunResults] = useState(null);
  const [submissionHistory, setSubmissionHistory] = useState([]);
  const [historyStatus, setHistoryStatus] = useState({
    loading: Boolean(student?.id),
    error: ""
  });
  const [problemOrder, setProblemOrder] = useState([]);
  const [suggestionState, setSuggestionState] = useState({
    visible: false,
    suggestions: [],
    selectedIndex: 0,
    wordStart: 0,
    cursorPosition: 0,
    popupTop: 18,
    popupLeft: 18
  });
  const [editorFontSize, setEditorFontSize] = useState(15);
  const [isDraftReady, setIsDraftReady] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timerState, setTimerState] = useState(initialTimerState);
  const [showRunDetails, setShowRunDetails] = useState(false);
  const [showSubmissionDetails, setShowSubmissionDetails] = useState(false);
  const [toast, setToast] = useState(initialToastState);
  const latestSubmission = submissionHistory[0] ?? null;
  const isSolved = useMemo(() => {
    return submissionHistory.some((submission) => submission.status === "accepted");
  }, [submissionHistory]);

  function showToast(type, title, message) {
    setToast({
      visible: true,
      type,
      title,
      message
    });
  }

  useEffect(() => {
    setIsDraftReady(false);

    const savedDrafts = readStoredObject(editorDraftStorageKey);
    const savedDraft = savedDrafts[problemId];

    if (!savedDraft) {
      setEditor(initialEditor);
      setIsDraftReady(true);
      return;
    }

    setEditor({
      language: savedDraft.language || "python",
      sourceCode: savedDraft.sourceCode || ""
    });
    setIsDraftReady(true);
  }, [problemId]);

  useEffect(() => {
    if (!problemId || !isDraftReady) {
      return;
    }

    const savedDrafts = readStoredObject(editorDraftStorageKey);
    savedDrafts[problemId] = {
      language: editor.language,
      sourceCode: editor.sourceCode
    };
    localStorage.setItem(editorDraftStorageKey, JSON.stringify(savedDrafts));
  }, [editor.language, editor.sourceCode, isDraftReady, problemId]);

  useEffect(() => {
    let isMounted = true;

    async function loadProblem() {
      try {
        const response = await fetch(`${apiBaseUrl}/problems/${problemId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Unable to load coding question.");
        }

        if (isMounted) {
          setProblem(data);
          setStatus({
            loading: false,
            error: ""
          });
        }
      } catch (error) {
        if (isMounted) {
          setStatus({
            loading: false,
            error: error.message
          });
        }
      }
    }

    loadProblem();

    return () => {
      isMounted = false;
    };
  }, [problemId]);

  useEffect(() => {
    let isMounted = true;

    async function loadProblemOrder() {
      try {
        const response = await fetch(`${apiBaseUrl}/problems`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Unable to load coding questions.");
        }

        if (isMounted) {
          setProblemOrder(data);
        }
      } catch (_error) {
        if (isMounted) {
          setProblemOrder([]);
        }
      }
    }

    loadProblemOrder();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadSubmissionHistory() {
      if (!student?.id || !session?.token) {
        setHistoryStatus({
          loading: false,
          error: student?.id ? "Log in again to view submission history." : ""
        });
        return;
      }

      try {
        const response = await fetch(
          `${apiBaseUrl}/submissions/student/${student.id}?problemId=${problemId}`,
          {
            headers: {
              ...getAuthHeaders(session.token)
            }
          }
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Unable to load submission history.");
        }

        if (isMounted) {
          setSubmissionHistory(data);
          setHistoryStatus({
            loading: false,
            error: ""
          });
        }
      } catch (error) {
        if (isMounted) {
          setHistoryStatus({
            loading: false,
            error: error.message
          });
        }
      }
    }

    loadSubmissionHistory();

    return () => {
      isMounted = false;
    };
  }, [problemId, session?.token, student?.id]);

  useEffect(() => {
    setLatestExecutionDetails(latestSubmission?.compiler_output || "");
  }, [latestSubmission]);

  useEffect(() => {
    setRunResults(null);
    setRunMessage("");
    setSubmissionMessage("");
    setLatestSubmitResults([]);
    setLatestSubmitExecution(null);
    setSubmissionHistory([]);
    setHistoryStatus({
      loading: Boolean(student?.id),
      error: ""
    });
    setShowRunDetails(false);
    setShowSubmissionDetails(false);
  }, [problemId, student?.id]);

  useEffect(() => {
    if (!toast.visible) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setToast((currentToast) => ({
        ...currentToast,
        visible: false
      }));
    }, 2600);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [toast.visible]);

  useEffect(() => {
    if (!problemId) {
      return undefined;
    }

    const solvedTimeKey = getSolvedTimeStorageKey(problemId);
    const savedSolvedTime = localStorage.getItem(solvedTimeKey);

    if (isSolved) {
      if (savedSolvedTime !== null) {
        const parsedSolvedTime = Number.parseInt(savedSolvedTime, 10);
        const normalizedSolvedTime = Number.isNaN(parsedSolvedTime) ? 0 : parsedSolvedTime;

        setElapsedSeconds(normalizedSolvedTime);
        setTimerState({
          isRunning: false,
          startedAt: 0,
          elapsedBeforePause: normalizedSolvedTime
        });
      }

      return undefined;
    }

    const savedTimers = readStoredObject(problemTimerStorageKey);
    const savedTimer = savedTimers[problemId];
    const normalizedTimer =
      savedTimer && typeof savedTimer === "object"
        ? {
            isRunning: savedTimer.isRunning ?? false,
            startedAt: savedTimer.startedAt ?? 0,
            elapsedBeforePause: savedTimer.elapsedBeforePause ?? 0
          }
        : {
            isRunning: false,
            startedAt: 0,
            elapsedBeforePause: typeof savedTimer === "number" ? savedTimer : 0
          };

    if (!savedTimer) {
      savedTimers[problemId] = normalizedTimer;
      localStorage.setItem(problemTimerStorageKey, JSON.stringify(savedTimers));
    }

    setTimerState(normalizedTimer);

    const updateElapsed = () => {
      if (!normalizedTimer.isRunning) {
        setElapsedSeconds(normalizedTimer.elapsedBeforePause);
        return;
      }

      setElapsedSeconds(
        normalizedTimer.elapsedBeforePause +
          Math.max(0, Math.floor((Date.now() - normalizedTimer.startedAt) / 1000))
      );
    };

    updateElapsed();
    const timerId = window.setInterval(updateElapsed, 1000);

    return () => {
      window.clearInterval(timerId);
    };
  }, [problemId, isSolved]);

  useEffect(() => {
    if (isSolved && problemId) {
      const solvedTimeKey = getSolvedTimeStorageKey(problemId);
      const savedSolvedTime = localStorage.getItem(solvedTimeKey);

      let frozenElapsedSeconds = Number.parseInt(savedSolvedTime || "", 10);

      if (Number.isNaN(frozenElapsedSeconds)) {
        frozenElapsedSeconds =
          timerState.elapsedBeforePause +
          (timerState.isRunning
            ? Math.max(0, Math.floor((Date.now() - timerState.startedAt) / 1000))
            : 0);
        localStorage.setItem(solvedTimeKey, String(frozenElapsedSeconds));
      }

      if (
        timerState.isRunning ||
        timerState.startedAt !== 0 ||
        timerState.elapsedBeforePause !== frozenElapsedSeconds
      ) {
        setTimerState({
          isRunning: false,
          startedAt: 0,
          elapsedBeforePause: frozenElapsedSeconds
        });
      }

      setElapsedSeconds(frozenElapsedSeconds);
    }
  }, [isSolved, problemId, timerState]);

  useEffect(() => {
    if (!problemId) {
      return;
    }

    if (isSolved) {
      return;
    }

    const savedTimers = readStoredObject(problemTimerStorageKey);
    savedTimers[problemId] = timerState;
    localStorage.setItem(problemTimerStorageKey, JSON.stringify(savedTimers));

    if (!timerState.isRunning) {
      setElapsedSeconds(timerState.elapsedBeforePause);
      return;
    }

    setElapsedSeconds(
      timerState.elapsedBeforePause +
        Math.max(0, Math.floor((Date.now() - timerState.startedAt) / 1000))
    );
  }, [isSolved, problemId, timerState]);

  function updateSuggestionState(sourceCode, cursorPosition, language) {
    const suggestionResult = buildSuggestions(sourceCode, cursorPosition, language);
    const caretCoordinates = getCaretCoordinates(editorRef.current, cursorPosition);

    setSuggestionState({
      visible: suggestionResult.matches.length > 0,
      suggestions: suggestionResult.matches,
      selectedIndex: 0,
      wordStart: suggestionResult.wordStart,
      cursorPosition,
      popupTop: caretCoordinates.top,
      popupLeft: caretCoordinates.left
    });
  }

  function applyEditorValue(nextSourceCode, nextSelectionStart, nextSelectionEnd = nextSelectionStart) {
    setEditor((currentEditor) => ({
      ...currentEditor,
      sourceCode: nextSourceCode
    }));

    window.requestAnimationFrame(() => {
      if (editorRef.current) {
        editorRef.current.focus();
        editorRef.current.setSelectionRange(nextSelectionStart, nextSelectionEnd);
      }
    });

    updateSuggestionState(nextSourceCode, nextSelectionStart, editor.language);
  }

  function acceptSuggestion(index = suggestionState.selectedIndex) {
    const textarea = editorRef.current;

    if (!textarea || !suggestionState.suggestions[index]) {
      return;
    }

    const selectedSuggestion = suggestionState.suggestions[index];
    let before = editor.sourceCode.slice(0, suggestionState.wordStart);
    const after = editor.sourceCode.slice(textarea.selectionStart);
    const insertText = selectedSuggestion.insertText;

    if (before.endsWith("#") && insertText.startsWith("#")) {
      before = before.slice(0, -1);
    }

    const nextSourceCode = `${before}${insertText}${after}`;
    const nextCursorPosition = before.length + insertText.length;

    applyEditorValue(nextSourceCode, nextCursorPosition);
  }

  function handleEditorChange(event) {
    const { name, value } = event.target;

    setEditor((currentEditor) => ({
      ...currentEditor,
      [name]: value
    }));

    if (name === "language") {
      setSuggestionState({
        visible: false,
        suggestions: [],
        selectedIndex: 0,
        wordStart: 0,
        cursorPosition: 0
      });
      return;
    }

    updateSuggestionState(value, event.target.selectionStart, editor.language);
  }

  function handleEditorKeyDown(event) {
    const textarea = event.currentTarget;
    const { selectionStart, selectionEnd, value } = textarea;
    const selectedText = value.slice(selectionStart, selectionEnd);
    const nextCharacter = value[selectionEnd] || "";

    if (suggestionState.visible && event.key === "ArrowDown") {
      event.preventDefault();
      setSuggestionState((current) => ({
        ...current,
        selectedIndex: (current.selectedIndex + 1) % current.suggestions.length
      }));
      return;
    }

    if (suggestionState.visible && event.key === "ArrowUp") {
      event.preventDefault();
      setSuggestionState((current) => ({
        ...current,
        selectedIndex:
          (current.selectedIndex - 1 + current.suggestions.length) % current.suggestions.length
      }));
      return;
    }

    if (suggestionState.visible && event.key === "Tab") {
      event.preventDefault();
      acceptSuggestion();
      return;
    }

    if (suggestionState.visible && event.key === "Enter") {
      setSuggestionState((current) => ({
        ...current,
        visible: false
      }));
      return;
    }

    if (event.key === "Escape") {
      setSuggestionState((current) => ({
        ...current,
        visible: false
      }));
      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();
      const nextSourceCode = `${value.slice(0, selectionStart)}  ${value.slice(selectionEnd)}`;
      applyEditorValue(nextSourceCode, selectionStart + 2);
      return;
    }

    if (event.key === "Enter" && value[selectionStart - 1] === "{" && nextCharacter === "}") {
      event.preventDefault();
      const indent = editor.language === "python" ? "    " : "  ";
      const nextSourceCode = `${value.slice(0, selectionStart)}\n${indent}\n${value.slice(selectionEnd)}`;
      applyEditorValue(nextSourceCode, selectionStart + indent.length + 1);
      return;
    }

    if (pairedCharacters[event.key]) {
      event.preventDefault();
      const closingCharacter = pairedCharacters[event.key];
      const nextSourceCode = `${value.slice(0, selectionStart)}${event.key}${selectedText}${closingCharacter}${value.slice(selectionEnd)}`;
      const nextCursorPosition = selectedText ? selectionEnd + 2 : selectionStart + 1;
      const nextSelectionEnd = selectedText ? selectionEnd + 1 : nextCursorPosition;
      applyEditorValue(nextSourceCode, nextCursorPosition, nextSelectionEnd);
      return;
    }

    if (Object.values(pairedCharacters).includes(event.key) && nextCharacter === event.key) {
      event.preventDefault();
      applyEditorValue(value, selectionStart + 1);
      return;
    }

    if (
      event.key === "Backspace" &&
      selectionStart === selectionEnd &&
      pairedCharacters[value[selectionStart - 1]] === value[selectionStart]
    ) {
      event.preventDefault();
      const nextSourceCode = `${value.slice(0, selectionStart - 1)}${value.slice(selectionStart + 1)}`;
      applyEditorValue(nextSourceCode, selectionStart - 1);
      return;
    }
  }

  function handleEditorScroll(event) {
    const { scrollTop, scrollLeft } = event.currentTarget;

    if (highlightRef.current) {
      highlightRef.current.scrollTop = scrollTop;
      highlightRef.current.scrollLeft = scrollLeft;
    }

    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = scrollTop;
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!student?.id || !session?.token) {
      setSubmissionMessage("Student session not found. Please log in again.");
      return;
    }

    setIsSubmitting(true);
    setSubmissionMessage("");
    setRunResults(null);
    setRunMessage("");
    setConsoleTab("results");

    try {
      const response = await fetch(`${apiBaseUrl}/submissions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(session.token)
        },
        body: JSON.stringify({
          studentId: student.id,
          problemId,
          language: editor.language,
          sourceCode: editor.sourceCode
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to submit solution.");
      }

      setSubmissionHistory((currentHistory) => [data.submission, ...currentHistory]);
      setSubmissionMessage(
        formatExecutionMessage(data.execution, "Latest result: success.")
      );
      setLatestExecutionDetails(data.submission.compiler_output || "");
      setLatestSubmitResults(data.testCaseResults || []);
      setLatestSubmitExecution(data.execution || null);
      setShowSubmissionDetails(true);

      if (data.submission?.status === "accepted") {
        showToast("success", "Accepted", "Submission passed hidden test cases.");
      } else {
        showToast(
          "error",
          data.execution?.verdictLabel || "Submission failed",
          "Check the submission panel for detailed feedback."
        );
      }
    } catch (error) {
      setSubmissionMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRunCode() {
    if (!session?.token) {
      setRunMessage("Student session not found. Please log in again.");
      return;
    }

    if (!editor.sourceCode.trim()) {
      setRunMessage("Write some code before running sample test cases.");
      return;
    }

    setIsRunning(true);
    setRunMessage("");
    setSubmissionMessage("");
    setLatestExecutionDetails("");
    setLatestSubmitResults([]);
    setLatestSubmitExecution(null);
    setConsoleTab("results");

    try {
      const response = await fetch(`${apiBaseUrl}/submissions/run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(session.token)
        },
        body: JSON.stringify({
          problemId,
          language: editor.language,
          sourceCode: editor.sourceCode
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to run sample test cases.");
      }

      setRunResults(data.result);
      setRunMessage(
        formatExecutionMessage(data.result, "Run completed on sample test cases.")
      );
      setShowRunDetails(true);

      if (data.result?.status === "accepted") {
        showToast("success", "Accepted", "All visible test cases passed.");
      } else {
        showToast(
          "error",
          data.result?.verdictLabel || "Run failed",
          "Open the test cases below to review the failure."
        );
      }
    } catch (error) {
      setRunMessage(error.message);
    } finally {
      setIsRunning(false);
    }
  }

  function formatElapsedTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (totalSeconds % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  }

  function handleTimerStart() {
    setTimerState((currentTimerState) => {
      if (isSolved || currentTimerState.isRunning) {
        return currentTimerState;
      }

      return {
        isRunning: true,
        startedAt: Date.now(),
        elapsedBeforePause: currentTimerState.elapsedBeforePause
      };
    });
  }

  function handleTimerPause() {
    setTimerState((currentTimerState) => {
      if (isSolved || !currentTimerState.isRunning) {
        return currentTimerState;
      }

      return {
        isRunning: false,
        startedAt: currentTimerState.startedAt,
        elapsedBeforePause:
          currentTimerState.elapsedBeforePause +
          Math.max(0, Math.floor((Date.now() - currentTimerState.startedAt) / 1000))
      };
    });
  }

  function handleTimerReset() {
    if (problemId) {
      localStorage.removeItem(getSolvedTimeStorageKey(problemId));

      const savedTimers = readStoredObject(problemTimerStorageKey);
      delete savedTimers[problemId];
      localStorage.setItem(problemTimerStorageKey, JSON.stringify(savedTimers));
    }

    setTimerState(initialTimerState);
    setElapsedSeconds(0);
  }

  const currentProblemIndex = problemOrder.findIndex((entry) => entry.id === problemId);
  const previousProblem =
    currentProblemIndex > 0 ? problemOrder[currentProblemIndex - 1] : null;
  const nextProblem =
    currentProblemIndex >= 0 && currentProblemIndex < problemOrder.length - 1
      ? problemOrder[currentProblemIndex + 1]
      : null;
  const failedTestCount = latestSubmission
    ? Math.max((latestSubmission.total_test_cases || 0) - (latestSubmission.passed_test_cases || 0), 0)
    : 0;
  const editorLineNumbers = useMemo(() => {
    const lineCount = Math.max(editor.sourceCode.split("\n").length, 1);
    return Array.from({ length: lineCount }, (_, index) => index + 1);
  }, [editor.sourceCode]);
  const highlightedCode = useMemo(
    () => highlightCode(editor.sourceCode, editor.language),
    [editor.language, editor.sourceCode]
  );
  const submissionMessageClassName = submissionMessage.toLowerCase().includes("success")
    ? "success"
    : "error";
  const runMessageClassName = runResults?.status === "accepted" ? "success" : "error";
  const latestRunErrorType = runResults?.errorType
    ? runResults.errorType.replaceAll("_", " ")
    : "none";
  const latestSubmitErrorType = latestSubmitExecution?.errorType
    ? latestSubmitExecution.errorType.replaceAll("_", " ")
    : "none";

  return (
    <main className="detail-page student-detail-page">
      {toast.visible ? (
        <div className={`workspace-toast workspace-toast-${toast.type}`} role="status" aria-live="polite">
          <strong>{toast.title}</strong>
          <span>{toast.message}</span>
        </div>
      ) : null}
      <section className="detail-card student-detail-card student-workspace-card">
        <div className="workspace-topbar">
          <div className="workspace-topbar-copy">
            <p className="auth-kicker">Practice Workspace</p>
            <h1>
              {currentProblemIndex >= 0 && problem
                ? `Problem ${currentProblemIndex + 1}`
                : "Problem Workspace"}
            </h1>
            <p className="workspace-topbar-note">
              Read the prompt, code your solution, and review the latest verdict in one place.
            </p>
          </div>
          <div className="workspace-nav-cluster">
            <span className={`workspace-timer-chip ${timerState.isRunning ? "" : "paused"}`}>
              Timer {formatElapsedTime(elapsedSeconds)}
            </span>
            <button
              className="workspace-timer-toggle"
              type="button"
              onClick={handleTimerStart}
              disabled={timerState.isRunning}
            >
              Start
            </button>
            <button
              className="workspace-timer-toggle"
              type="button"
              onClick={handleTimerPause}
              disabled={!timerState.isRunning}
            >
              Pause
            </button>
            <button
              className="workspace-timer-toggle workspace-timer-reset"
              type="button"
              onClick={handleTimerReset}
            >
              Reset
            </button>
            <Link
              className={`workspace-arrow ${previousProblem ? "" : "disabled"}`}
              to={previousProblem ? `/student/problems/${previousProblem.id}` : "#"}
              aria-disabled={previousProblem ? "false" : "true"}
              onClick={(event) => {
                if (!previousProblem) {
                  event.preventDefault();
                }
              }}
            >
              Prev
            </Link>
            <Link
              className="workspace-arrow workspace-arrow-secondary"
              to="/student/problems"
            >
              All Problems
            </Link>
            <Link
              className={`workspace-arrow ${nextProblem ? "" : "disabled"}`}
              to={nextProblem ? `/student/problems/${nextProblem.id}` : "#"}
              aria-disabled={nextProblem ? "false" : "true"}
              onClick={(event) => {
                if (!nextProblem) {
                  event.preventDefault();
                }
              }}
            >
              Next
            </Link>
          </div>
        </div>
        {status.loading ? <h1>Loading question...</h1> : null}
        {status.error ? <p className="form-status error">{status.error}</p> : null}

        {problem ? (
          <section className="workspace-shell">
            <article className="detail-block workspace-column workspace-problem-panel">
              <div className="workspace-problem-header">
                <div>
                  <div className="workspace-tab-row workspace-tab-row-compact">
                    <span className="workspace-tab active">Problem</span>
                    <span className="workspace-tab">Samples</span>
                    <span className="workspace-tab">Notes</span>
                  </div>
                  <h2 className="workspace-problem-title">
                    {currentProblemIndex >= 0 ? `${currentProblemIndex + 1}. ` : ""}
                    {problem.title}
                  </h2>
                </div>
                <span className="question-count">#{currentProblemIndex >= 0 ? currentProblemIndex + 1 : "-"}</span>
              </div>

              <div className="workspace-meta-row workspace-meta-row-rich">
                <span className={`difficulty-pill ${problem.difficulty}`}>{problem.difficulty}</span>
                <span className="workspace-meta-chip">
                  {(problem.sample_test_cases || []).length} sample cases
                </span>
                <span className="workspace-meta-chip">
                  {(problem.tags || []).length} topics
                </span>
              </div>

              <div className="pill-row">
                {(problem.tags || []).map((tag) => (
                  <span className="tag-pill" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>

              <div className="workspace-subsection workspace-statement-section">
                <p className="workspace-statement-copy">{problem.statement}</p>
              </div>

              <div className="workspace-brief-strip">
                <article className="workspace-brief-card">
                  <span>Mode</span>
                  <strong>Timed coding round</strong>
                  <p>Use Run for visible cases and Submit for hidden platform checks.</p>
                </article>
                <article className="workspace-brief-card">
                  <span>Language</span>
                  <strong>{editor.language.toUpperCase()}</strong>
                  <p>Switch languages anytime without leaving the problem screen.</p>
                </article>
              </div>

              <div className="workspace-subsection">
                <div className="workspace-section-heading">
                  <h3>Problem requirements</h3>
                  <span className="workspace-section-tag">Like a coding round brief</span>
                </div>
                <div className="workspace-requirement-grid">
                  <article className="workspace-info-card">
                    <span>Input format</span>
                    <p>{problem.input_format || "No input format provided yet."}</p>
                  </article>
                  <article className="workspace-info-card">
                    <span>Output format</span>
                    <p>{problem.output_format || "No output format provided yet."}</p>
                  </article>
                  <article className="workspace-info-card workspace-info-card-wide">
                    <span>Constraints</span>
                    <p>{problem.constraints_text || "No constraints provided yet."}</p>
                  </article>
                  <article className="workspace-info-card workspace-info-card-wide">
                    <span>Editorial hint</span>
                    <p>{problem.examples_text || "No example explanation provided yet."}</p>
                  </article>
                </div>
              </div>

              <div className="workspace-subsection">
                <div className="workspace-section-heading">
                  <h3>Important note</h3>
                  <span className="workspace-section-tag">Assessment behavior</span>
                </div>
                <div className="workspace-note-card">
                  <p>
                    `Run code` executes only the public sample cases shown below. `Submit solution`
                    checks your final answer against hidden evaluation cases and records the result.
                  </p>
                </div>
              </div>

              <div className="workspace-subsection">
                <div className="workspace-section-heading">
                  <h3>Sample test cases</h3>
                  <span className="workspace-section-tag">Use these before submitting</span>
                </div>
                {problem.sample_test_cases?.length ? (
                  <div className="sample-case-list">
                    {problem.sample_test_cases.map((testCase, index) => (
                      <article className="sample-case-card" key={testCase.id || index}>
                        <div className="sample-case-header">
                          <strong>Example {index + 1}</strong>
                          <span className="workspace-meta-chip">Public case</span>
                        </div>
                        <div className="sample-case-block">
                          <span>Input</span>
                          <p className="history-snippet">{testCase.input_data}</p>
                        </div>
                        <div className="sample-case-block">
                          <span>Expected output</span>
                          <p className="history-snippet">{testCase.expected_output}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p>No sample cases shared yet.</p>
                )}
              </div>
            </article>

            <section className="workspace-right-column">
              <section className="detail-block workspace-column editor-column">
                <div className="workspace-ide-topbar">
                  <div className="workspace-file-tab-group">
                    <span className="workspace-file-pill">Explorer</span>
                    <span className="workspace-file-tab">
                      {problem.title.replace(/\s+/g, "").slice(0, 14) || "Solution"}.
                      {editor.language === "python"
                        ? "py"
                        : editor.language === "javascript"
                          ? "js"
                          : editor.language === "java"
                            ? "java"
                            : "cpp"}
                    </span>
                  </div>
                  <div className="workspace-ide-actions">
                    <button
                      className="auth-button ghost-button editor-action-button"
                      type="button"
                      onClick={handleRunCode}
                      disabled={isRunning || isSubmitting}
                    >
                      {isRunning ? "Running..." : "Run"}
                    </button>
                    <button
                      className="auth-button student-button editor-action-button"
                      type="submit"
                      form="problem-editor-form"
                      disabled={isSubmitting || isRunning}
                    >
                      {isSubmitting ? "Submitting..." : "Submit"}
                    </button>
                  </div>
                </div>

                <div className="workspace-column-header workspace-editor-header">
                  <div>
                    <p className="auth-kicker">Code Editor</p>
                    <h2>Solve this problem</h2>
                  </div>
                  <div className="editor-toolbar editor-toolbar-wide">
                    <label className="form-field editor-toolbar-label" htmlFor="language">
                      Language
                    </label>
                    <select
                      id="language"
                      name="language"
                      value={editor.language}
                      onChange={handleEditorChange}
                    >
                      <option value="python">Python</option>
                      <option value="cpp">C++</option>
                      <option value="java">Java</option>
                      <option value="javascript">JavaScript</option>
                    </select>
                  </div>
                </div>

                <div className="workspace-editor-notes workspace-editor-toolbar-row">
                  <span className="workspace-meta-chip">Auto-check enabled</span>
                  <span className="workspace-meta-chip">Run: sample tests only</span>
                  <span className="workspace-meta-chip">Submit: hidden tests only</span>
                  <span className="workspace-meta-chip">Supported: Python, C++, Java, JavaScript</span>
                  <div className="editor-zoom-controls" aria-label="Editor zoom controls">
                    <button
                      className="editor-zoom-button"
                      type="button"
                      onClick={() => setEditorFontSize((currentSize) => Math.max(currentSize - 1, 12))}
                    >
                      A-
                    </button>
                    <span className="workspace-meta-chip editor-zoom-label">{editorFontSize}px</span>
                    <button
                      className="editor-zoom-button"
                      type="button"
                      onClick={() => setEditorFontSize((currentSize) => Math.min(currentSize + 1, 24))}
                    >
                      A+
                    </button>
                  </div>
                </div>
                <form className="auth-form editor-form" id="problem-editor-form" onSubmit={handleSubmit}>
                  <label className="form-field" htmlFor="sourceCode">
                    Source code
                  </label>
                  <div className="editor-surface">
                    <div
                      className="code-editor-shell"
                      style={{ fontSize: `${editorFontSize}px` }}
                      onClick={(event) => {
                        if (event.target === event.currentTarget || event.target === highlightRef.current) {
                          editorRef.current?.focus();
                        }
                      }}
                    >
                      <div className="code-editor-gutter" ref={lineNumbersRef} aria-hidden="true">
                        {editorLineNumbers.map((lineNumber) => (
                          <span key={lineNumber}>{lineNumber}</span>
                        ))}
                      </div>
                      <div className="code-editor-stage">
                        <pre
                          ref={highlightRef}
                          className="code-editor-highlight"
                          aria-hidden="true"
                          dangerouslySetInnerHTML={{
                            __html: `${highlightedCode}${editor.sourceCode.endsWith("\n") ? "\n " : " "}`
                          }}
                        />
                        <textarea
                          ref={editorRef}
                          id="sourceCode"
                          name="sourceCode"
                          rows="18"
                          className="code-editor-input"
                          placeholder="Write your solution here..."
                          value={editor.sourceCode}
                          onChange={handleEditorChange}
                          onKeyDown={handleEditorKeyDown}
                          onScroll={handleEditorScroll}
                          spellCheck="false"
                          autoCapitalize="off"
                          autoComplete="off"
                          autoCorrect="off"
                          onBlur={() => {
                            window.setTimeout(() => {
                              setSuggestionState((current) => ({
                                ...current,
                                visible: false
                              }));
                            }, 120);
                          }}
                          onClick={(event) => {
                            updateSuggestionState(
                              event.currentTarget.value,
                              event.currentTarget.selectionStart,
                              editor.language
                            );
                          }}
                          required
                        />
                      </div>
                    </div>
                    {suggestionState.visible ? (
                      <div
                        className="editor-suggestion-panel"
                        style={{
                          top: `${suggestionState.popupTop}px`,
                          left: `${suggestionState.popupLeft}px`
                        }}
                      >
                        {suggestionState.suggestions.map((entry, index) => (
                          <button
                            className={`editor-suggestion-item ${index === suggestionState.selectedIndex ? "active" : ""}`}
                            key={`${entry.label}-${index}`}
                            type="button"
                            onMouseDown={(event) => {
                              event.preventDefault();
                              acceptSuggestion(index);
                            }}
                          >
                            <strong>{entry.label}</strong>
                            <span>{entry.insertText.replace(/\n/g, " ").slice(0, 42)}</span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="workspace-submit-row">
                    <span className="question-meta">
                      Run checks visible cases. Submit checks hidden platform cases.
                    </span>
                  </div>
                </form>
              </section>

              <section className="detail-block workspace-column console-column" style={{ marginTop: "1rem" }}>
                <div className="workspace-column-header" style={{ marginBottom: "1rem" }}>
                  <div>
                    <p className="auth-kicker">Console</p>
                    <h2>Execution Results & Submissions</h2>
                  </div>
                </div>

                <div className="workspace-console-tabbar" style={{ marginBottom: "1.2rem" }}>
                  <button
                    type="button"
                    className={`workspace-console-tab ${consoleTab === "results" ? "active" : ""}`}
                    onClick={() => setConsoleTab("results")}
                    style={{ cursor: "pointer", outline: "none" }}
                  >
                    Test Results
                  </button>
                  <button
                    type="button"
                    className={`workspace-console-tab ${consoleTab === "submissions" ? "active" : ""}`}
                    onClick={() => setConsoleTab("submissions")}
                    style={{ cursor: "pointer", outline: "none" }}
                  >
                    Submissions ({submissionHistory.length})
                  </button>
                </div>

                {consoleTab === "results" && (
                  <>
                    {/* Run Results */}
                    {runResults && (
                      <>
                        {runMessage ? <p className={`form-status ${runMessageClassName}`}>{runMessage}</p> : null}
                        <div className="workspace-result-overview testcase-overview">
                          <article className="workspace-result-card">
                            <span>Run verdict</span>
                            <strong>{runResults.verdictLabel || runResults.status.replaceAll("_", " ")}</strong>
                          </article>
                          <article className="workspace-result-card">
                            <span>Passed</span>
                            <strong>
                              {runResults.passedTestCases}/{runResults.totalTestCases}
                            </strong>
                          </article>
                          <article className="workspace-result-card">
                            <span>Error type</span>
                            <strong>{latestRunErrorType}</strong>
                          </article>
                          <article className="workspace-result-card">
                            <span>Runtime</span>
                            <strong>{runResults.executionTimeMs ?? "-"} ms</strong>
                          </article>
                        </div>

                        <div className="sample-case-list testcase-result-list">
                          {(runResults.testCaseResults || []).map((testCaseResult, index) => (
                            <article className="sample-case-card testcase-result-card" key={testCaseResult.id || index}>
                              <div className="sample-case-header">
                                <strong>Test case {index + 1}</strong>
                                <span
                                  className={`status-pill ${
                                    testCaseResult.passed ? "accepted" : "wrong_answer"
                                  }`}
                                >
                                  {testCaseResult.passed ? "passed" : "failed"}
                                </span>
                              </div>
                              <div className="sample-case-block">
                                <span>Input</span>
                                <p className="history-snippet">{testCaseResult.input || "(empty)"}</p>
                              </div>
                              <div className="sample-case-block">
                                <span>Expected output</span>
                                <p className="history-snippet">{testCaseResult.expectedOutput || "(empty)"}</p>
                              </div>
                              <div className="sample-case-block">
                                <span>Your output</span>
                                <p className="history-snippet">{testCaseResult.actualOutput || "(empty)"}</p>
                              </div>
                              {testCaseResult.stderr ? (
                                <div className="sample-case-block">
                                  <span>Error output</span>
                                  <p className="history-snippet">{testCaseResult.stderr}</p>
                                </div>
                              ) : null}
                            </article>
                          ))}
                        </div>

                        {runResults.stderr ? (
                          <div className="workspace-subsection">
                            <div className="workspace-section-heading">
                              <h3>Run error output</h3>
                              <span className="workspace-section-tag">
                                {runResults.verdictLabel || "Execution error"}
                              </span>
                            </div>
                            <pre className="history-snippet workspace-console-output">{runResults.stderr}</pre>
                          </div>
                        ) : null}
                      </>
                    )}

                    {/* Submit Results */}
                    {latestSubmission && !runResults && (
                      <>
                        {submissionMessage ? (
                          <p className={`form-status ${submissionMessageClassName}`}>{submissionMessage}</p>
                        ) : null}

                        <div className="workspace-result-overview">
                          <article className="workspace-result-card">
                            <span>Latest verdict</span>
                            <strong>
                              {latestSubmitExecution?.verdictLabel ||
                                latestSubmission.status.replaceAll("_", " ")}
                            </strong>
                          </article>
                          <article className="workspace-result-card">
                            <span>Passed tests</span>
                            <strong>
                              {`${latestSubmission.passed_test_cases}/${latestSubmission.total_test_cases}`}
                            </strong>
                          </article>
                          <article className="workspace-result-card">
                            <span>Failed tests</span>
                            <strong>{failedTestCount}</strong>
                          </article>
                          <article className="workspace-result-card">
                            <span>Error type</span>
                            <strong>{latestSubmitErrorType}</strong>
                          </article>
                          <article className="workspace-result-card">
                            <span>Runtime</span>
                            <strong>{`${latestSubmission.execution_time_ms ?? "-"} ms`}</strong>
                          </article>
                        </div>

                        {latestExecutionDetails ? (
                          <div className="workspace-subsection workspace-result-log">
                            <div className="workspace-section-heading">
                              <h3>Latest execution log</h3>
                              <span className="workspace-section-tag">Compiler and runtime feedback</span>
                            </div>
                            <pre className="history-snippet workspace-console-output">{latestExecutionDetails}</pre>
                          </div>
                        ) : null}

                        {latestSubmitExecution?.stderr ? (
                          <div className="workspace-subsection">
                            <div className="workspace-section-heading">
                              <h3>Error output</h3>
                              <span className="workspace-section-tag">Compiler or runtime stream</span>
                            </div>
                            <pre className="history-snippet workspace-console-output">
                              {latestSubmitExecution.stderr}
                            </pre>
                          </div>
                        ) : null}
                      </>
                    )}

                    {/* No results yet */}
                    {!runResults && !latestSubmission && (
                      <p className="dashboard-copy">
                        Use Run to execute sample test cases, or Submit to evaluate against all test cases.
                      </p>
                    )}
                  </>
                )}

                {consoleTab === "submissions" && (
                  <>
                    {historyStatus.loading ? <p className="dashboard-copy">Loading submission history...</p> : null}
                    {historyStatus.error ? <p className="form-status error">{historyStatus.error}</p> : null}

                    {!historyStatus.loading && !historyStatus.error && submissionHistory.length === 0 ? (
                      <p className="dashboard-copy">No submissions yet. Send your first solution above.</p>
                    ) : null}
                    {!historyStatus.loading && !historyStatus.error && submissionHistory.length > 0 ? (
                      <div className="history-list workspace-history-list">
                        {submissionHistory.map((submission) => (
                          <article className="history-card workspace-history-card" key={submission.id}>
                            <div className="question-card-top">
                              <span className={`status-pill ${submission.status}`}>
                                {submission.status.replaceAll("_", " ")}
                              </span>
                              <span className="question-meta">
                                {new Date(submission.submitted_at).toLocaleString()}
                              </span>
                            </div>
                            <strong>{submission.language.toUpperCase()}</strong>
                            <p className="question-meta">
                              {submission.passed_test_cases}/{submission.total_test_cases} passed |{" "}
                              {Math.max(
                                (submission.total_test_cases || 0) - (submission.passed_test_cases || 0),
                                0
                              )} failed | {submission.execution_time_ms ?? "-"} ms
                            </p>
                            {submission.compiler_output ? (
                              <p className="question-meta">{submission.compiler_output.split("\n")[0]}</p>
                            ) : null}
                            <p className="history-snippet">{submission.source_code}</p>
                          </article>
                        ))}
                      </div>
                    ) : null}
                  </>
                )}

            </section>
          </section>
        </section>
        ) : null}

        <div className="detail-actions">
          <Link className="auth-button student-button detail-link" to="/student/problems">
            Back to question list
          </Link>
          <Link className="auth-button ghost-button detail-link" to="/student/dashboard">
            Back to dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
