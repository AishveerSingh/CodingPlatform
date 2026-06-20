import { useEffect, useState } from "react";
import { PlatformLayout, PlatformSection, PlatformStats } from "../../components/PlatformLayout";
import { clearAdminSession, getAdminSession, getAuthHeaders } from "../../utils/session";

const apiBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const initialFacultyForm = {
  fullName: "",
  email: "",
  password: "",
  employeeId: "",
  department: "CSE",
  designation: "Faculty"
};

export default function AdminFacultyList() {
  const session = getAdminSession();
  const [faculty, setFaculty] = useState([]);
  const [filters, setFilters] = useState({
    search: ""
  });
  const [facultyForm, setFacultyForm] = useState(initialFacultyForm);
  const [status, setStatus] = useState({
    loading: true,
    error: ""
  });
  const [createStatus, setCreateStatus] = useState({ message: "", error: "" });
  const [isCreating, setIsCreating] = useState(false);

  function handleExpiredAdminSession(message = "Your admin session expired. Please log in again.") {
    clearAdminSession();
    setFaculty([]);
    setStatus({
      loading: false,
      error: message
    });
  }

  async function loadFaculty(searchValue = filters.search) {
    setStatus({
      loading: true,
      error: ""
    });

    if (!session?.token) {
      setFaculty([]);
      setStatus({
        loading: false,
        error: "Log in as an admin to view faculty."
      });
      return;
    }

    try {
      const params = new URLSearchParams({
        role: "faculty"
      });

      if (searchValue.trim()) {
        params.set("search", searchValue.trim());
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

        throw new Error(data.message || "Unable to load faculty.");
      }

      setFaculty(data);
      setStatus({
        loading: false,
        error: ""
      });
    } catch (error) {
      setStatus({
        loading: false,
        error: error.message
      });
    }
  }

  useEffect(() => {
    loadFaculty();
  }, [filters.search, session?.token]);

  async function handleCreateFaculty(event) {
    event.preventDefault();
    setIsCreating(true);
    setCreateStatus({ message: "", error: "" });

    try {
      const response = await fetch(`${apiBaseUrl}/users/faculty-register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(session?.token)
        },
        body: JSON.stringify(facultyForm)
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to create faculty account.");
      }

      setCreateStatus({
        message: data.message || "Faculty account created successfully.",
        error: ""
      });
      setFacultyForm(initialFacultyForm);
      loadFaculty();
    } catch (error) {
      setCreateStatus({
        message: "",
        error: error.message
      });
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <PlatformLayout
      role="admin"
      eyebrow="Faculty Directory"
      title="Create and review faculty login accounts"
      subtitle="Only admin can issue faculty credentials. Faculty members sign in with the assigned college email and password."
      meta={`${faculty.length} faculty`}
      sidebarNote="Keep faculty access controlled by admin so only approved college accounts can enter the teaching portal."
    >
      <PlatformStats
        items={[
          {
            label: "Faculty",
            value: faculty.length,
            note: "Visible under current filters"
          },
          {
            label: "Departments",
            value: new Set(faculty.map((member) => member.profile?.department).filter(Boolean)).size,
            note: "Represented teaching groups"
          },
          {
            label: "Accepted",
            value: faculty.reduce((sum, member) => sum + (member.accepted_count || 0), 0),
            note: "Current faculty coding history"
          }
        ]}
      />

      <PlatformSection label="Faculty Accounts" title="Create a faculty login">
        <form className="auth-form course-form-grid" onSubmit={handleCreateFaculty}>
          <input
            placeholder="Full name"
            value={facultyForm.fullName}
            onChange={(event) => setFacultyForm((current) => ({ ...current, fullName: event.target.value }))}
            required
          />
          <input
            placeholder="College email (name_employeeid@college.com)"
            value={facultyForm.email}
            onChange={(event) => setFacultyForm((current) => ({ ...current, email: event.target.value }))}
            required
          />
          <input
            type="password"
            minLength={8}
            placeholder="Temporary password"
            value={facultyForm.password}
            onChange={(event) => setFacultyForm((current) => ({ ...current, password: event.target.value }))}
            required
          />
          <input
            placeholder="Employee ID"
            value={facultyForm.employeeId}
            onChange={(event) => setFacultyForm((current) => ({ ...current, employeeId: event.target.value }))}
            required
          />
          <input
            placeholder="Department"
            value={facultyForm.department}
            onChange={(event) => setFacultyForm((current) => ({ ...current, department: event.target.value }))}
            required
          />
          <input
            placeholder="Designation"
            value={facultyForm.designation}
            onChange={(event) => setFacultyForm((current) => ({ ...current, designation: event.target.value }))}
            required
          />
          <button className="auth-button admin-button" type="submit" disabled={isCreating}>
            {isCreating ? "Creating..." : "Create faculty login"}
          </button>
        </form>
        {createStatus.message ? <p className="form-status success">{createStatus.message}</p> : null}
        {createStatus.error ? <p className="form-status error">{createStatus.error}</p> : null}
      </PlatformSection>

      <PlatformSection label="Search" title="Find faculty quickly">
        <div className="filter-bar">
          <input
            aria-label="Search faculty"
            className="filter-input"
            placeholder="Search by faculty name, email, or employee ID"
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

      <PlatformSection label="Roster" title="Issued faculty accounts">
        {status.loading ? <p className="dashboard-copy">Loading faculty...</p> : null}
        {status.error ? <p className="form-status error">{status.error}</p> : null}
        {!status.loading && !status.error && faculty.length === 0 ? (
          <p className="dashboard-copy">No faculty matched the current search.</p>
        ) : null}
        {!status.loading && !status.error && faculty.length > 0 ? (
          <div className="question-list">
            {faculty.map((member) => (
              <article className="question-card" key={member.id}>
                <div className="question-card-top">
                  <span className="difficulty-pill medium">faculty</span>
                  <span className="question-meta">
                    Joined {new Date(member.created_at).toLocaleDateString()}
                  </span>
                </div>
                <h3>{member.full_name}</h3>
                <p>{member.email}</p>
                <p className="question-meta">
                  {member.profile?.employee_id || "No employee ID"} | {member.profile?.department || "-"} |{" "}
                  {member.profile?.designation || "-"}
                </p>
              </article>
            ))}
          </div>
        ) : null}
      </PlatformSection>
    </PlatformLayout>
  );
}
