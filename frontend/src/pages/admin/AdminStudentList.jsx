import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PlatformLayout, PlatformSection, PlatformStats } from "../../components/PlatformLayout";
import { clearAdminSession, getAdminSession, getAuthHeaders } from "../../utils/session";
import { branchOptions, buildSemesterOptions, sectionOptions } from "../../types/course";

const apiBaseUrl = import.meta.env.VITE_API_URL || "https://codingplatform-qf38.onrender.com/api";
const initialStudentForm = {
  fullName: "",
  email: "",
  password: "",
  rollNumber: "",
  branch: branchOptions[0],
  semester: buildSemesterOptions()[0],
  section: sectionOptions[0],
  batch: "2024-2028"
};

export default function AdminStudentList() {
  const navigate = useNavigate();
  const session = getAdminSession();
  const [students, setStudents] = useState([]);
  const [filters, setFilters] = useState({
    search: ""
  });
  const [studentForm, setStudentForm] = useState(initialStudentForm);
  const [status, setStatus] = useState({
    loading: true,
    error: ""
  });
  const [createStatus, setCreateStatus] = useState({ message: "", error: "" });
  const [isCreating, setIsCreating] = useState(false);

  const [activeResetStudentId, setActiveResetStudentId] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetStatus, setResetStatus] = useState({ message: "", error: "" });
  const [isResetting, setIsResetting] = useState(false);

  async function handleCreateStudent(event) {
    event.preventDefault();
    setIsCreating(true);
    setCreateStatus({ message: "", error: "" });

    try {
      const response = await fetch(`${apiBaseUrl}/users/student-register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(session?.token)
        },
        body: JSON.stringify(studentForm)
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to create student account.");
      }

      setCreateStatus({
        message: data.message || "Student account created successfully.",
        error: ""
      });
      setStudentForm(initialStudentForm);
      await new Promise((resolve) => setTimeout(resolve, 0));
      navigate(0);
    } catch (error) {
      setCreateStatus({
        message: "",
        error: error.message
      });
    } finally {
      setIsCreating(false);
    }
  }

  async function handleResetPassword(event, studentId) {
    event.preventDefault();
    if (newPassword.trim().length < 8) {
      setResetStatus({
        message: "",
        error: "Password must be at least 8 characters long."
      });
      return;
    }

    setIsResetting(true);
    setResetStatus({ message: "", error: "" });

    try {
      const response = await fetch(`${apiBaseUrl}/users/${studentId}/reset-password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(session?.token)
        },
        body: JSON.stringify({ newPassword: newPassword.trim() })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to reset password.");
      }

      setResetStatus({
        message: data.message || "Password reset successfully.",
        error: ""
      });
      setNewPassword("");
      setTimeout(() => {
        setActiveResetStudentId(null);
        setResetStatus({ message: "", error: "" });
      }, 3000);
    } catch (error) {
      setResetStatus({
        message: "",
        error: error.message
      });
    } finally {
      setIsResetting(false);
    }
  }

  async function handleDeleteStudent(studentId, fullName) {
    if (!window.confirm(`Are you sure you want to permanently delete student "${fullName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/users/${studentId}`, {
        method: "DELETE",
        headers: {
          ...getAuthHeaders(session?.token)
        }
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete student account.");
      }

      alert(data.message || "Student account deleted successfully.");
      // Refresh list
      setStudents((prev) => prev.filter((s) => s.id !== studentId));
    } catch (error) {
      alert(error.message);
    }
  }



  function handleExpiredAdminSession(message = "Your admin session expired. Please log in again.") {
    clearAdminSession();
    setStudents([]);
    setStatus({
      loading: false,
      error: message
    });

    window.setTimeout(() => {
      navigate("/admin/login");
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
          if (response.status === 401) {
            handleExpiredAdminSession(data.message || "Your admin session expired. Please log in again.");
            return;
          }

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
        <form className="auth-form course-form-grid" onSubmit={handleCreateStudent} style={{ marginBottom: "1.5rem" }}>
          <strong>Create student account</strong>
          <input
            placeholder="Full name"
            value={studentForm.fullName}
            onChange={(event) => setStudentForm((current) => ({ ...current, fullName: event.target.value }))}
            required
          />
          <input
            placeholder="College email (name_rollno@college.com)"
            value={studentForm.email}
            onChange={(event) => setStudentForm((current) => ({ ...current, email: event.target.value }))}
            required
          />
          <input
            type="password"
            minLength={8}
            placeholder="Temporary password"
            value={studentForm.password}
            onChange={(event) => setStudentForm((current) => ({ ...current, password: event.target.value }))}
            required
          />
          <input
            placeholder="Roll number"
            value={studentForm.rollNumber}
            onChange={(event) => setStudentForm((current) => ({ ...current, rollNumber: event.target.value }))}
            required
          />
          <select
            value={studentForm.branch}
            onChange={(event) => setStudentForm((current) => ({ ...current, branch: event.target.value }))}
          >
            {branchOptions.map((branch) => (
              <option key={branch} value={branch}>
                {branch}
              </option>
            ))}
          </select>
          <select
            value={studentForm.semester}
            onChange={(event) => setStudentForm((current) => ({ ...current, semester: Number(event.target.value) }))}
          >
            {buildSemesterOptions().map((semester) => (
              <option key={semester} value={semester}>
                Semester {semester}
              </option>
            ))}
          </select>
          <select
            value={studentForm.section}
            onChange={(event) => setStudentForm((current) => ({ ...current, section: event.target.value }))}
          >
            {sectionOptions.map((section) => (
              <option key={section} value={section}>
                Section {section}
              </option>
            ))}
          </select>
          <input
            placeholder="Batch"
            value={studentForm.batch}
            onChange={(event) => setStudentForm((current) => ({ ...current, batch: event.target.value }))}
            required
          />
          <button className="auth-button admin-button" type="submit" disabled={isCreating}>
            {isCreating ? "Creating..." : "Create student login"}
          </button>
          {createStatus.message ? <p className="form-status success">{createStatus.message}</p> : null}
          {createStatus.error ? <p className="form-status error">{createStatus.error}</p> : null}
        </form>

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
                    <p className="question-meta">
                      {student.profile?.roll_number || "No roll number"} | {student.profile?.branch || "-"} | Sem{" "}
                      {student.profile?.semester || "-"} | Sec {student.profile?.section || "-"}
                    </p>
                    <div className="stats-inline">
                      <span>{student.submission_count} submissions</span>
                      <span>{student.accepted_count} accepted</span>
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
                      <Link
                        className="auth-button admin-button detail-link inline-link-button"
                        to={`/admin/students/${student.id}/submissions`}
                        style={{ flex: 1, textAlign: "center", marginTop: 0 }}
                      >
                        View submissions
                      </Link>
                      <button
                        className="auth-button ghost-button detail-link inline-link-button"
                        type="button"
                        style={{
                          flex: 1,
                          marginTop: 0,
                          background: "transparent",
                          border: "1px solid rgba(251, 146, 60, 0.4)",
                          color: "#f8fafc"
                        }}
                        onClick={() => {
                          if (activeResetStudentId === student.id) {
                            setActiveResetStudentId(null);
                            setNewPassword("");
                            setResetStatus({ message: "", error: "" });
                          } else {
                            setActiveResetStudentId(student.id);
                            setNewPassword("");
                            setResetStatus({ message: "", error: "" });
                          }
                        }}
                      >
                        {activeResetStudentId === student.id ? "Cancel" : "Reset Password"}
                      </button>
                    </div>
                    <div style={{ marginTop: "0.5rem" }}>
                      <button
                        className="auth-button ghost-button detail-link inline-link-button"
                        type="button"
                        style={{
                          width: "100%",
                          marginTop: 0,
                          background: "rgba(239, 68, 68, 0.08)",
                          border: "1px solid rgba(239, 68, 68, 0.2)",
                          color: "#fca5a5",
                          textAlign: "center"
                        }}
                        onClick={() => handleDeleteStudent(student.id, student.full_name)}
                      >
                        Delete Student
                      </button>
                    </div>

                    {activeResetStudentId === student.id ? (
                      <form
                        className="auth-form"
                        onSubmit={(e) => handleResetPassword(e, student.id)}
                        style={{
                          marginTop: "1.2rem",
                          padding: "1rem",
                          border: "1px solid rgba(148, 163, 184, 0.16)",
                          borderRadius: "16px",
                          background: "rgba(15, 23, 42, 0.4)"
                        }}
                      >
                        <span className="platform-sidebar-label" style={{ display: "block", marginBottom: "0.5rem" }}>
                          New Password
                        </span>
                        <input
                          type="password"
                          placeholder="Min 8 characters"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          minLength={8}
                          required
                          style={{
                            width: "100%",
                            padding: "0.75rem 1rem",
                            border: "1px solid rgba(148, 163, 184, 0.24)",
                            borderRadius: "14px",
                            background: "rgba(241, 245, 249, 0.96)",
                            color: "#0f172a",
                            outline: "none"
                          }}
                        />
                        <button
                          className="auth-button admin-button"
                          type="submit"
                          disabled={isResetting}
                          style={{ width: "100%", padding: "0.75rem", fontSize: "0.9rem" }}
                        >
                          {isResetting ? "Resetting..." : "Confirm Reset"}
                        </button>
                        {resetStatus.message ? (
                          <p className="form-status success" style={{ fontSize: "0.9rem" }}>{resetStatus.message}</p>
                        ) : null}
                        {resetStatus.error ? (
                          <p className="form-status error" style={{ fontSize: "0.9rem" }}>{resetStatus.error}</p>
                        ) : null}
                      </form>
                    ) : null}
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
