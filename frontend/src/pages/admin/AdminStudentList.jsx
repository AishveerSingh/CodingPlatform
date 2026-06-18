import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PlatformLayout, PlatformSection, PlatformStats } from "../../components/PlatformLayout";
import { getAdminSession, getAuthHeaders } from "../../utils/session";

const apiBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function AdminStudentList() {
  const session = getAdminSession();
  const [students, setStudents] = useState([]);
  const [filters, setFilters] = useState({
    search: ""
  });
  const [status, setStatus] = useState({
    loading: true,
    error: ""
  });

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
            error: "Log in as an admin to view students."
          });
        }
        return;
      }

      try {
        const params = new URLSearchParams({
          role: "student"
        });

        if (filters.search.trim()) {
          params.set("search", filters.search.trim());
        }

        const response = await fetch(`${apiBaseUrl}/users?${params.toString()}`, {
          headers: {
            ...getAuthHeaders(session.token)
          }
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Unable to load students.");
        }

        if (isMounted) {
          setStudents(data);
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

    loadStudents();

    return () => {
      isMounted = false;
    };
  }, [filters.search, session?.token]);

  return (
    <PlatformLayout
      role="admin"
      eyebrow="Student Directory"
      title="View all students on the platform"
      subtitle="Search the roster, compare submission activity, and open any learner's submission history from one review screen."
      meta={`${students.length} students`}
      sidebarNote="This directory should feel like an assessment platform roster: quick search, visible activity metrics, and one-click drill-down into attempts."
    >
      <PlatformStats
        items={[
          {
            label: "Students",
            value: students.length,
            note: "Visible under current filters"
          },
          {
            label: "Total submissions",
            value: students.reduce((sum, student) => sum + (student.submission_count || 0), 0),
            note: "Combined student activity"
          },
          {
            label: "Accepted",
            value: students.reduce((sum, student) => sum + (student.accepted_count || 0), 0),
            note: "Successful runs across students"
          }
        ]}
      />

      <PlatformSection label="Search" title="Find a student quickly">
        <div className="filter-bar">
          <input
            aria-label="Search students"
            className="filter-input"
            name="search"
            placeholder="Search by student name or email"
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

      <PlatformSection label="Roster" title="Open a student submission history">
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
                    <div className="stats-inline">
                      <span>{student.submission_count} submissions</span>
                      <span>{student.accepted_count} accepted</span>
                    </div>
                    <Link
                      className="auth-button admin-button detail-link inline-link-button"
                      to={`/admin/students/${student.id}/submissions`}
                    >
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
