import { useEffect, useState } from "react";
import { PlatformLayout, PlatformSection, PlatformStats } from "../../components/PlatformLayout";
import { clearAdminSession, getAdminSession, getAuthHeaders } from "../../utils/session";

const apiBaseUrl = import.meta.env.VITE_API_URL || "https://codingplatform-qf38.onrender.com/api";
const initialAdminForm = {
  fullName: "",
  email: "",
  password: ""
};

export default function AdminAdminList() {
  const session = getAdminSession();
  const [admins, setAdmins] = useState([]);
  const [filters, setFilters] = useState({
    search: ""
  });
  const [adminForm, setAdminForm] = useState(initialAdminForm);
  const [status, setStatus] = useState({
    loading: true,
    error: ""
  });
  const [createStatus, setCreateStatus] = useState({ message: "", error: "" });
  const [isCreating, setIsCreating] = useState(false);

  function handleExpiredAdminSession(message = "Your admin session expired. Please log in again.") {
    clearAdminSession();
    setAdmins([]);
    setStatus({
      loading: false,
      error: message
    });
  }

  async function loadAdmins(searchValue = filters.search) {
    setStatus({
      loading: true,
      error: ""
    });

    if (!session?.token) {
      setAdmins([]);
      setStatus({
        loading: false,
        error: "Log in as an admin to view admins."
      });
      return;
    }

    try {
      const params = new URLSearchParams({
        role: "admin"
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

        throw new Error(data.message || "Unable to load admins.");
      }

      setAdmins(data);
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
    loadAdmins();
  }, [filters.search, session?.token]);

  async function handleCreateAdmin(event) {
    event.preventDefault();
    setIsCreating(true);
    setCreateStatus({ message: "", error: "" });

    try {
      const response = await fetch(`${apiBaseUrl}/users/admin-register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(session?.token)
        },
        body: JSON.stringify(adminForm)
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to create admin account.");
      }

      setCreateStatus({
        message: data.message || "Admin account created successfully.",
        error: ""
      });
      setAdminForm(initialAdminForm);
      loadAdmins();
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
      eyebrow="Admin Directory"
      title="Create and review administrator accounts"
      subtitle="Authorized administrator accounts can manage courses, problem bank, faculty and students."
      meta={`${admins.length} admins`}
      sidebarNote="Admin accounts have full backend control of the platform. Make sure only authorized university admins have access."
    >
      <PlatformStats
        items={[
          {
            label: "Administrators",
            value: admins.length,
            note: "Total platform managers"
          },
          {
            label: "Control Level",
            value: "Full Control",
            note: "Read & write database privilege"
          }
        ]}
      />

      <PlatformSection label="New Administrator" title="Create an admin login">
        <form className="auth-form course-form-grid" onSubmit={handleCreateAdmin}>
          <input
            placeholder="Full name"
            value={adminForm.fullName}
            onChange={(event) => setAdminForm((current) => ({ ...current, fullName: event.target.value }))}
            required
          />
          <input
            placeholder="College email (name_admin@college.com)"
            value={adminForm.email}
            onChange={(event) => setAdminForm((current) => ({ ...current, email: event.target.value }))}
            required
          />
          <input
            type="password"
            minLength={8}
            placeholder="Password (Min 8 chars)"
            value={adminForm.password}
            onChange={(event) => setAdminForm((current) => ({ ...current, password: event.target.value }))}
            required
          />
          <button className="auth-button admin-button" type="submit" disabled={isCreating}>
            {isCreating ? "Creating..." : "Create admin login"}
          </button>
        </form>
        {createStatus.message ? <p className="form-status success">{createStatus.message}</p> : null}
        {createStatus.error ? <p className="form-status error">{createStatus.error}</p> : null}
      </PlatformSection>

      <PlatformSection label="Search" title="Find admin quickly">
        <div className="filter-bar">
          <input
            aria-label="Search admins"
            className="filter-input"
            placeholder="Search by admin name or email"
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

      <PlatformSection label="Roster" title="Issued administrator accounts">
        {status.loading ? <p className="dashboard-copy">Loading admins...</p> : null}
        {status.error ? <p className="form-status error">{status.error}</p> : null}
        {!status.loading && !status.error && admins.length === 0 ? (
          <p className="dashboard-copy">No admins matched the current search.</p>
        ) : null}
        {!status.loading && !status.error && admins.length > 0 ? (
          <div className="question-list">
            {admins.map((adm) => (
              <article className="question-card" key={adm.id}>
                <div className="question-card-top">
                  <span className="difficulty-pill hard">admin</span>
                  <span className="question-meta">
                    Joined {new Date(adm.created_at).toLocaleDateString()}
                  </span>
                </div>
                <h3>{adm.full_name}</h3>
                <p>{adm.email}</p>
                {adm.id === session?.user?.id ? (
                  <p className="question-meta" style={{ color: "#22c55e", fontWeight: "bold" }}>
                    Currently logged in
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        ) : null}
      </PlatformSection>
    </PlatformLayout>
  );
}
