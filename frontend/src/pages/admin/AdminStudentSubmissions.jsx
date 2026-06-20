import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PlatformLayout, PlatformSection, PlatformStats } from "../../components/PlatformLayout";
import { clearAdminSession, getAdminSession, getAuthHeaders } from "../../utils/session";

const apiBaseUrl = import.meta.env.VITE_API_URL || "https://codingplatform-qf38.onrender.com/api";

export default function AdminStudentSubmissions() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const session = getAdminSession();
  const [student, setStudent] = useState(null);
  const [problems, setProblems] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [filters, setFilters] = useState({
    problemId: "",
    status: "",
    language: ""
  });
  const [studentStatus, setStudentStatus] = useState({
    loading: true,
    error: ""
  });
  const [submissionStatus, setSubmissionStatus] = useState({
    loading: true,
    error: ""
  });

  function handleExpiredAdminSession(message = "Your admin session expired. Please log in again.") {
    clearAdminSession();
    setStudent(null);
    setSubmissions([]);
    setStudentStatus({
      loading: false,
      error: message
    });
    setSubmissionStatus({
      loading: false,
      error: message
    });

    window.setTimeout(() => {
      navigate("/admin/login");
    }, 300);
  }

  useEffect(() => {
    let isMounted = true;

    async function loadStudent() {
      if (!session?.token) {
        if (isMounted) {
          setStudentStatus({
            loading: false,
            error: "Log in as an admin to review submissions."
          });
        }
        return;
      }

      try {
        const response = await fetch(`${apiBaseUrl}/users/${studentId}`, {
          headers: {
            ...getAuthHeaders(session.token)
          }
        });
        const data = await response.json();

        if (!response.ok) {
          if (response.status === 401) {
            handleExpiredAdminSession(data.message || "Your admin session expired. Please log in again.");
            return;
          }

          throw new Error(data.message || "Unable to load student.");
        }

        if (isMounted) {
          setStudent(data);
          setStudentStatus({
            loading: false,
            error: ""
          });
        }
      } catch (error) {
        if (isMounted) {
          setStudentStatus({
            loading: false,
            error: error.message
          });
        }
      }
    }

    async function loadProblems() {
      try {
        const response = await fetch(`${apiBaseUrl}/problems`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Unable to load coding questions.");
        }

        if (isMounted) {
          setProblems(data);
        }
      } catch (_error) {
        if (isMounted) {
          setProblems([]);
        }
      }
    }

    loadStudent();
    loadProblems();

    return () => {
      isMounted = false;
    };
  }, [session?.token, studentId]);

  useEffect(() => {
    let isMounted = true;

    async function loadSubmissions() {
      setSubmissionStatus({
        loading: true,
        error: ""
      });

      try {
        if (!session?.token) {
          throw new Error("Log in as an admin to review submissions.");
        }

        const params = new URLSearchParams({
          studentId
        });

        if (filters.problemId) {
          params.set("problemId", filters.problemId);
        }

        if (filters.status) {
          params.set("status", filters.status);
        }

        if (filters.language) {
          params.set("language", filters.language);
        }

        const response = await fetch(`${apiBaseUrl}/submissions?${params.toString()}`, {
          headers: {
            ...getAuthHeaders(session.token)
          }
        });
        const data = await response.json();

        if (!response.ok) {
          if (response.status === 401) {
            handleExpiredAdminSession(data.message || "Your admin session expired. Please log in again.");
            return;
          }

          throw new Error(data.message || "Unable to load submissions.");
        }

        if (isMounted) {
          setSubmissions(data);
          setSubmissionStatus({
            loading: false,
            error: ""
          });
        }
      } catch (error) {
        if (isMounted) {
          setSubmissionStatus({
            loading: false,
            error: error.message
          });
        }
      }
    }

    loadSubmissions();

    return () => {
      isMounted = false;
    };
  }, [filters.language, filters.problemId, filters.status, session?.token, studentId]);

  return (
    <PlatformLayout
      role="admin"
      eyebrow="Submission Review"
      title={student ? `${student.full_name}'s attempts` : "Student submission review"}
      subtitle="Filter by problem, status, and language to inspect the same kinds of attempt histories you would expect in a professional coding assessment tool."
      meta={`${submissions.length} visible submissions`}
      actions={
        <Link className="auth-button ghost-button panel-action-button" to="/admin/students">
          Back to students
        </Link>
      }
      sidebarNote="Use this page as a submission audit console: filter the stream, inspect verdicts, and review source attempts with execution feedback."
    >
      {studentStatus.loading ? <p className="dashboard-copy">Loading student...</p> : null}
      {studentStatus.error ? <p className="form-status error">{studentStatus.error}</p> : null}

      {student ? (
        <PlatformStats
          items={[
            { label: "Email", value: student.email, note: "Student account" },
            { label: "Total submissions", value: student.submission_count, note: "All recorded attempts" },
            { label: "Accepted", value: student.accepted_count, note: "Successful verdicts" }
          ]}
        />
      ) : null}

      <PlatformSection label="Filters" title="Narrow the submission stream">
        <div className="filter-bar">
          <select
            aria-label="Filter submissions by problem"
            className="filter-select"
            name="problemId"
            value={filters.problemId}
            onChange={(event) => {
              setFilters((currentFilters) => ({
                ...currentFilters,
                problemId: event.target.value
              }));
            }}
          >
            <option value="">All questions</option>
            {problems.map((problem) => (
              <option key={problem.id} value={problem.id}>
                {problem.title}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter submissions by status"
            className="filter-select"
            name="status"
            value={filters.status}
            onChange={(event) => {
              setFilters((currentFilters) => ({
                ...currentFilters,
                status: event.target.value
              }));
            }}
          >
            <option value="">All statuses</option>
            <option value="accepted">Accepted</option>
            <option value="wrong_answer">Wrong answer</option>
            <option value="time_limit">Time limit</option>
          </select>
          <select
            aria-label="Filter submissions by language"
            className="filter-select"
            name="language"
            value={filters.language}
            onChange={(event) => {
              setFilters((currentFilters) => ({
                ...currentFilters,
                language: event.target.value
              }));
            }}
          >
            <option value="">All languages</option>
            <option value="python">Python</option>
            <option value="cpp">C++</option>
            <option value="java">Java</option>
            <option value="javascript">JavaScript</option>
          </select>
        </div>
      </PlatformSection>

      <PlatformSection label="Attempt History" title="Inspect each submission">
        {submissionStatus.loading ? <p className="dashboard-copy">Loading submissions...</p> : null}
        {submissionStatus.error ? <p className="form-status error">{submissionStatus.error}</p> : null}

        {!submissionStatus.loading && !submissionStatus.error ? (
          <>
            {submissions.length === 0 ? (
              <p className="dashboard-copy">No submissions matched the current filters.</p>
            ) : (
              <div className="history-list">
                {submissions.map((submission) => (
                  <article className="history-card" key={submission.id}>
                    <div className="question-card-top">
                      <span className={`status-pill ${submission.status}`}>
                        {submission.status.replaceAll("_", " ")}
                      </span>
                      <span className="question-meta">
                        {new Date(submission.submitted_at).toLocaleString()}
                      </span>
                    </div>
                    <strong>{submission.problem_title}</strong>
                    <p className="question-meta">
                      {submission.language.toUpperCase()} - {submission.difficulty}
                    </p>
                    {submission.compiler_output ? (
                      <p className="question-meta">{submission.compiler_output.split("\n")[0]}</p>
                    ) : null}
                    <p className="history-snippet">{submission.source_code}</p>
                  </article>
                ))}
              </div>
            )}
          </>
        ) : null}
      </PlatformSection>
    </PlatformLayout>
  );
}
