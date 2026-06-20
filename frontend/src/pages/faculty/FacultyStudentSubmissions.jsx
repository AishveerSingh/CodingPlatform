import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PlatformLayout, PlatformSection, PlatformStats } from "../../components/PlatformLayout";
import { apiRequest } from "../../utils/api";
import { clearFacultySession, getFacultySession } from "../../utils/session";

export default function FacultyStudentSubmissions() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const session = getFacultySession();
  const [student, setStudent] = useState(null);
  const [problems, setProblems] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [filters, setFilters] = useState({
    problemId: ""
  });
  const [studentStatus, setStudentStatus] = useState({
    loading: true,
    error: ""
  });
  const [submissionStatus, setSubmissionStatus] = useState({
    loading: true,
    error: ""
  });

  function handleExpiredFacultySession(message = "Your faculty session expired. Please log in again.") {
    clearFacultySession();
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
      navigate("/faculty/login");
    }, 300);
  }

  useEffect(() => {
    let isMounted = true;

    async function loadStudent() {
      if (!session?.token) {
        if (isMounted) {
          setStudentStatus({
            loading: false,
            error: "Log in as faculty to review student submissions."
          });
        }
        return;
      }

      try {
        const data = await apiRequest(`/users/students/accessible/${studentId}`, {}, session.token);

        if (isMounted) {
          setStudent(data);
          setStudentStatus({
            loading: false,
            error: ""
          });
        }
      } catch (error) {
        if (isMounted) {
          if (error.message === "Invalid or expired token.") {
            handleExpiredFacultySession();
            return;
          }

          setStudentStatus({
            loading: false,
            error: error.message
          });
        }
      }
    }

    async function loadProblems() {
      try {
        const data = await apiRequest("/problems");

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
          throw new Error("Log in as faculty to review student submissions.");
        }

        const params = new URLSearchParams();
        if (filters.problemId) {
          params.set("problemId", filters.problemId);
        }

        const data = await apiRequest(`/submissions/student/${studentId}?${params.toString()}`, {}, session.token);

        if (isMounted) {
          setSubmissions(data);
          setSubmissionStatus({
            loading: false,
            error: ""
          });
        }
      } catch (error) {
        if (isMounted) {
          if (error.message === "Invalid or expired token.") {
            handleExpiredFacultySession();
            return;
          }

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
  }, [filters.problemId, session?.token, studentId]);

  return (
    <PlatformLayout
      role="faculty"
      eyebrow="Submission Review"
      title={student ? `${student.full_name}'s attempts` : "Student submission review"}
      subtitle="Inspect coding attempts for students in your assigned courses without opening admin-only account controls."
      meta={`${submissions.length} submissions`}
      actions={
        <Link className="auth-button ghost-button panel-action-button" to="/faculty/students">
          Back to students
        </Link>
      }
      sidebarNote="This view gives faculty teaching visibility into attempts while still keeping access limited to students inside shared course assignments."
    >
      {studentStatus.loading ? <p className="dashboard-copy">Loading student...</p> : null}
      {studentStatus.error ? <p className="form-status error">{studentStatus.error}</p> : null}

      {student ? (
        <PlatformStats
          items={[
            { label: "Email", value: student.email, note: "Student account" },
            { label: "Roll number", value: student.profile?.roll_number || "-", note: "Roster identity" },
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
                      {submission.language.toUpperCase()} | {submission.difficulty} | {submission.passed_test_cases}/
                      {submission.total_test_cases} tests
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
