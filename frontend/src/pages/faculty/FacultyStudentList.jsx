import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PlatformLayout, PlatformSection, PlatformStats } from "../../components/PlatformLayout";
import { apiRequest } from "../../utils/api";
import { clearFacultySession, getFacultySession } from "../../utils/session";

export default function FacultyStudentList() {
  const navigate = useNavigate();
  const session = getFacultySession();
  const [students, setStudents] = useState([]);
  const [filters, setFilters] = useState({
    search: ""
  });
  const [status, setStatus] = useState({
    loading: true,
    error: ""
  });

  function handleExpiredFacultySession(message = "Your faculty session expired. Please log in again.") {
    clearFacultySession();
    setStudents([]);
    setStatus({
      loading: false,
      error: message
    });

    window.setTimeout(() => {
      navigate("/faculty/login");
    }, 300);
  }

  useEffect(() => {
    let isMounted = true;

    async function loadStudents() {
      setStatus({
        loading: true,
        error: ""
      });

      if (!session?.token) {
        if (isMounted) {
          setStudents([]);
          setStatus({
            loading: false,
            error: "Log in as faculty to review accessible students."
          });
        }
        return;
      }

      try {
        const params = new URLSearchParams();
        if (filters.search.trim()) {
          params.set("search", filters.search.trim());
        }

        const data = await apiRequest(`/users/students/accessible?${params.toString()}`, {}, session.token);

        if (isMounted) {
          setStudents(data);
          setStatus({
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

          setStatus({
            loading: false,
            error: error.message
          });
        }
      }
    }

    loadStudents();

    return () => {
      isMounted = false;
    };
  }, [filters.search, session?.token]);

  return (
    <PlatformLayout
      role="faculty"
      eyebrow="Student Access"
      title="Review the students you teach"
      subtitle="Faculty can see only students enrolled in at least one assigned course, keeping roster access aligned with real teaching responsibility."
      meta={`${students.length} students`}
      sidebarNote="Student access for faculty stays limited to shared courses, so roster review and attempt inspection never leak outside assigned teaching scope."
    >
      <PlatformStats
        items={[
          {
            label: "Students",
            value: students.length,
            note: "Reachable from assigned courses"
          },
          {
            label: "Total submissions",
            value: students.reduce((sum, student) => sum + (student.submission_count || 0), 0),
            note: "Combined coding activity"
          },
          {
            label: "Accepted",
            value: students.reduce((sum, student) => sum + (student.accepted_count || 0), 0),
            note: "Successful verdicts"
          }
        ]}
      />

      <PlatformSection label="Search" title="Find a student quickly">
        <div className="filter-bar">
          <input
            aria-label="Search students"
            className="filter-input"
            name="search"
            placeholder="Search by student name, email, or roll number"
            type="search"
            value={filters.search}
            onChange={(event) => {
              setFilters({
                search: event.target.value
              });
            }}
          />
        </div>
      </PlatformSection>

      <PlatformSection label="Roster" title="Open student activity">
        {status.loading ? <p className="dashboard-copy">Loading students...</p> : null}
        {status.error ? <p className="form-status error">{status.error}</p> : null}

        {!status.loading && !status.error ? (
          <>
            {students.length === 0 ? (
              <p className="dashboard-copy">No students matched the current search.</p>
            ) : (
              <div className="question-list">
                {students.map((student) => (
                  <article className="question-card" key={student.id}>
                    <div className="question-card-top">
                      <span className="difficulty-pill easy">student</span>
                      <span className="question-meta">
                        Joined {new Date(student.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <h3>{student.full_name}</h3>
                    <p>{student.email}</p>
                    <p className="question-meta">
                      {student.profile?.roll_number || "No roll number"} | {student.profile?.branch || "-"} | Sem{" "}
                      {student.profile?.semester || "-"} | Sec {student.profile?.section || "-"}
                    </p>
                    <div className="stats-inline">
                      <span>{student.submission_count} submissions</span>
                      <span>{student.accepted_count} accepted</span>
                    </div>
                    <Link className="auth-button student-button detail-link" to={`/faculty/students/${student.id}/submissions`}>
                      View submissions
                    </Link>
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
