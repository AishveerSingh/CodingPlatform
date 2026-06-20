import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import AccountSection from "../../components/AccountSection";
import { PlatformLayout, PlatformSection, PlatformStats } from "../../components/PlatformLayout";
import { getAdminSession, getAuthHeaders, saveAdminSession } from "../../utils/session";

const apiBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function AdminDashboard() {
  const location = useLocation();
  const [session, setSession] = useState(location.state?.session || getAdminSession());
  const user = session?.user;
  const [problems, setProblems] = useState([]);
  const [students, setStudents] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [logs, setLogs] = useState([]);
  const [problemStatus, setProblemStatus] = useState({
    loading: true,
    error: ""
  });
  const [studentStatus, setStudentStatus] = useState({
    loading: true,
    error: ""
  });
  const [logStatus, setLogStatus] = useState({
    loading: true,
    error: ""
  });
  const [facultyStatus, setFacultyStatus] = useState({
    loading: true,
    error: ""
  });

  useEffect(() => {
    loadProblems();
    loadStudents();
    loadFaculty();
    loadLogs();
  }, [session?.token]);

  async function loadProblems() {
    try {
      const response = await fetch(`${apiBaseUrl}/problems`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load coding questions.");
      }

      setProblems(data);
      setProblemStatus({
        loading: false,
        error: ""
      });
    } catch (error) {
      setProblemStatus({
        loading: false,
        error: error.message
      });
    }
  }

  async function loadFaculty() {
    if (!session?.token) {
      setFaculty([]);
      setFacultyStatus({
        loading: false,
        error: "Log in as an admin to view faculty."
      });
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/users?role=faculty`, {
        headers: {
          ...getAuthHeaders(session.token)
        }
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load faculty.");
      }

      setFaculty(data);
      setFacultyStatus({
        loading: false,
        error: ""
      });
    } catch (error) {
      setFacultyStatus({
        loading: false,
        error: error.message
      });
    }
  }

  async function loadStudents() {
    if (!session?.token) {
      setStudents([]);
      setStudentStatus({
        loading: false,
        error: "Log in as an admin to view students."
      });
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/users?role=student`, {
        headers: {
          ...getAuthHeaders(session.token)
        }
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load students.");
      }

      setStudents(data);
      setStudentStatus({
        loading: false,
        error: ""
      });
    } catch (error) {
      setStudentStatus({
        loading: false,
        error: error.message
      });
    }
  }

  async function loadLogs() {
    if (!session?.token) {
      setLogs([]);
      setLogStatus({
        loading: false,
        error: "Log in as an admin to review recent activity."
      });
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/admin/logs?limit=6`, {
        headers: {
          ...getAuthHeaders(session.token)
        }
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load admin activity.");
      }

      setLogs(data);
      setLogStatus({
        loading: false,
        error: ""
      });
    } catch (error) {
      setLogStatus({
        loading: false,
        error: error.message
      });
    }
  }

  return (
    <PlatformLayout
      role="admin"
      eyebrow="Admin Dashboard"
      title={user ? `Welcome back, ${user.full_name}.` : "Admin control room"}
      subtitle={
        user
          ? `Monitor courses, student activity, and administrative actions from one academic operations workspace. Signed in as ${user.email}.`
          : "Open the admin login page to register or sign in."
      }
      meta="Admin Portal"
      actions={
        <>
          <Link className="auth-button admin-button panel-action-button" to="/admin/courses">
            Manage courses
          </Link>
          <Link className="auth-button ghost-button panel-action-button" to="/admin/problems/new">
            Create problem
          </Link>
        </>
      }
      sidebarNote="This admin area is designed like a coding-platform operations console: curate the bank, inspect participants, and track platform activity without leaving the workflow."
    >
      <PlatformStats
        items={[
          {
            label: "Problem bank",
            value: problems.length,
            note: "Published and draft-ready prompts"
          },
          {
            label: "Students",
            value: students.length,
            note: "Registered student accounts"
          },
          {
            label: "Faculty",
            value: faculty.length,
            note: "Assigned teaching accounts"
          },
          {
            label: "Recent logs",
            value: logs.length,
            note: "Latest tracked admin events"
          }
        ]}
      />

      <PlatformSection
        label="Course Control"
        title="Run batch-wise course assignment"
        actions={
          <Link className="auth-button admin-button panel-action-button" to="/admin/courses">
            Open courses
          </Link>
        }
      >
        <p className="dashboard-copy">
          Create courses, map them to branches and semesters, assign faculty, and enforce
          section-wise student access with backend permission checks.
        </p>
      </PlatformSection>

      <PlatformSection
        label="Question Manager"
        title="Manage the problem bank"
        actions={
          <>
            <Link className="auth-button admin-button panel-action-button" to="/admin/problems/new">
              Add question
            </Link>
            <Link className="auth-button ghost-button panel-action-button" to="/admin/problems">
              View list
            </Link>
          </>
        }
      >
        <p className="dashboard-copy">
          Open the creation flow to add fresh coding prompts, or review the existing bank before
          publishing more practice content.
        </p>
        {problemStatus.error ? <p className="form-status error">{problemStatus.error}</p> : null}
        {problemStatus.loading ? <p className="dashboard-copy">Loading coding questions...</p> : null}
      </PlatformSection>

      <PlatformSection
        label="Faculty Accounts"
        title="Create faculty login credentials"
        actions={
          <Link className="auth-button admin-button panel-action-button" to="/admin/faculty">
            Manage faculty
          </Link>
        }
      >
        <p className="dashboard-copy">
          Admin assigns college email IDs and passwords to faculty accounts before they can log in.
        </p>
        {facultyStatus.error ? <p className="form-status error">{facultyStatus.error}</p> : null}
        {facultyStatus.loading ? <p className="dashboard-copy">Loading faculty...</p> : null}
      </PlatformSection>

      <PlatformSection
        label="Student Directory"
        title="Review students and submission health"
        actions={
          <Link className="auth-button admin-button panel-action-button" to="/admin/students">
            View all students
          </Link>
        }
      >
        <p className="dashboard-copy">
          Admin also assigns student college emails and passwords here before learners can access the portal.
        </p>
        {studentStatus.error ? <p className="form-status error">{studentStatus.error}</p> : null}
        {studentStatus.loading ? <p className="dashboard-copy">Loading students...</p> : null}
      </PlatformSection>

      <PlatformSection label="Admin Logs" title="Recent activity">
        {logStatus.loading ? <p className="dashboard-copy">Loading admin activity...</p> : null}
        {logStatus.error ? <p className="form-status error">{logStatus.error}</p> : null}
        {!logStatus.loading && !logStatus.error ? (
          logs.length ? (
            <div className="history-list">
              {logs.map((log) => (
                <article className="history-card" key={log.id}>
                  <div className="question-card-top">
                    <span className="difficulty-pill medium">{log.action_type.replaceAll("_", " ")}</span>
                    <span className="question-meta">{new Date(log.created_at).toLocaleString()}</span>
                  </div>
                  <strong>{log.admin_name}</strong>
                  <p>
                    {log.target_type} {log.target_id ? `#${String(log.target_id).slice(0, 8)}` : ""}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <p className="dashboard-copy">No admin activity has been recorded yet.</p>
          )
        ) : null}
      </PlatformSection>

      <AccountSection
        role="admin"
        session={session}
        saveSession={(nextSession) => {
          saveAdminSession(nextSession);
          setSession(nextSession);
        }}
      />
    </PlatformLayout>
  );
}
