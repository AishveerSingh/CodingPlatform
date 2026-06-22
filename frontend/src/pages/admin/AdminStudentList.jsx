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

  const [deleteConfirm, setDeleteConfirm] = useState({
    show: false,
    userId: null,
    userName: null,
    role: "student",
    isDeleting: false,
    statusMessage: "",
    statusType: ""
  });


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

  function handleDeleteStudent(studentId, fullName) {
    setDeleteConfirm({
      show: true,
      userId: studentId,
      userName: fullName,
      role: "student",
      isDeleting: false,
      statusMessage: "",
      statusType: ""
    });
  }

  async function confirmDeleteStudent() {
    setDeleteConfirm((prev) => ({ ...prev, isDeleting: true }));
    try {
      const response = await fetch(`${apiBaseUrl}/users/${deleteConfirm.userId}`, {
        method: "DELETE",
        headers: {
          ...getAuthHeaders(session?.token)
        }
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete student account.");
      }

      setStudents((prev) => prev.filter((s) => s.id !== deleteConfirm.userId));
      setDeleteConfirm((prev) => ({
        ...prev,
        isDeleting: false,
        statusMessage: data.message || "Student account deleted successfully.",
        statusType: "success"
      }));
    } catch (error) {
      setDeleteConfirm((prev) => ({
        ...prev,
        isDeleting: false,
        statusMessage: error.message,
        statusType: "error"
      }));
    }
  }

  function closeDeleteModal() {
    setDeleteConfirm({
      show: false,
      userId: null,
      userName: null,
      role: "student",
      isDeleting: false,
      statusMessage: "",
      statusType: ""
    });
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
                        className="auth-button ghost-button detail-link inline-link-button platform-danger-btn"
                        type="button"
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

      {deleteConfirm.show && (
        <div className="custom-modal-overlay">
          <div className="custom-modal">
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "rgba(239, 68, 68, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto",
                color: "#ef4444"
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" />
                </svg>
              </div>
            </div>
            
            {deleteConfirm.statusMessage ? (
              <>
                <h2 style={{ fontSize: "1.35rem", margin: "0 0 0.5rem" }}>
                  {deleteConfirm.statusType === "success" ? "Success" : "Error"}
                </h2>
                <p style={{ color: deleteConfirm.statusType === "success" ? "#10b981" : "#ef4444", marginBottom: "1.5rem" }}>
                  {deleteConfirm.statusMessage}
                </p>
                <button
                  className="auth-button admin-button"
                  style={{ width: "100%", marginTop: 0 }}
                  onClick={closeDeleteModal}
                >
                  Okay
                </button>
              </>
            ) : (
              <>
                <h2 style={{ fontSize: "1.35rem", margin: "0 0 0.5rem" }}>Delete Student</h2>
                <p style={{ opacity: 0.8, marginBottom: "1.5rem", fontSize: "0.95rem" }}>
                  Are you sure you want to permanently delete student <strong>{deleteConfirm.userName}</strong>? This action will cascade delete all associated profiles, enrollments, and submissions.
                </p>
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <button
                    className="auth-button ghost-button"
                    style={{ flex: 1, marginTop: 0, border: "1px solid rgba(148, 163, 184, 0.3)" }}
                    onClick={closeDeleteModal}
                    disabled={deleteConfirm.isDeleting}
                  >
                    Cancel
                  </button>
                  <button
                    className="auth-button"
                    style={{
                      flex: 1,
                      marginTop: 0,
                      background: "#ef4444",
                      borderColor: "#ef4444",
                      color: "#ffffff"
                    }}
                    onClick={confirmDeleteStudent}
                    disabled={deleteConfirm.isDeleting}
                  >
                    {deleteConfirm.isDeleting ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </PlatformLayout>
  );
}
