import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { saveAdminSession } from "../../utils/session";
import { apiRequest } from "../../utils/api";

const initialForm = {
  fullName: "",
  email: "",
  password: ""
};
const adminHighlights = [
  "Centralized problem bank control",
  "Student submission visibility",
  "Protected operations workflow"
];

export default function AdminLogin() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState({
    type: "",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus({
      type: "",
      message: ""
    });

    const authPayload =
      mode === "register"
        ? form
        : {
            email: form.email,
            password: form.password
          };

    try {
      let data;

      try {
        data = await apiRequest(
          mode === "register" ? "/auth/register/admin" : "/auth/login/admin",
          {
            method: "POST",
            body: JSON.stringify(authPayload)
          }
        );
      } catch (_error) {
        data = await apiRequest(
          mode === "register" ? "/users/admin-register" : "/users/admin-login",
          {
            method: "POST",
            body: JSON.stringify({
              fullName: form.fullName,
              email: form.email,
              password: form.password
            })
          }
        );
      }

      const session = {
        token: data.token,
        user: data.user
      };

      saveAdminSession(session);
      setForm(initialForm);
      setStatus({
        type: "success",
        message: data.message
      });

      navigate("/admin/dashboard", {
        state: {
          session
        }
      });
    } catch (error) {
      setStatus({
        type: "error",
        message: error.message
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page admin-auth-page">
      <aside className="auth-side admin-side">
        <p className="auth-side-label">Control room</p>
        <h2>Run the coding platform from a sharper admin control room.</h2>
        <p className="login-copy">
          Sign in to manage the question bank, review learners, and audit platform activity from a
          more professional operations workflow.
        </p>
        <div className="auth-badge-row auth-badge-row-side">
          <span className="auth-badge">Question review</span>
          <span className="auth-badge">Student analytics</span>
          <span className="auth-badge">Activity logs</span>
        </div>
        <div className="auth-feature-list">
          {adminHighlights.map((highlight) => (
            <article className="auth-feature-item" key={highlight}>
              <span className="auth-feature-dot" />
              <p>{highlight}</p>
            </article>
          ))}
        </div>
        <div className="auth-side-metrics">
          <article>
            <span>Scope</span>
            <strong>Problem bank</strong>
          </article>
          <article>
            <span>Review</span>
            <strong>Student attempts</strong>
          </article>
        </div>
      </aside>

      <section className="auth-panel admin-panel auth-entry-panel">
        <div className="auth-form-panel-header">
          <p className="auth-kicker">Admin Access</p>
          <h1>{mode === "register" ? "Register" : "Log in"}</h1>
          <p className="auth-form-panel-copy">
            {mode === "register"
              ? "Create a protected admin account for platform operations."
              : "Continue into the admin control dashboard."}
          </p>
        </div>

        <div className="auth-switcher" role="tablist" aria-label="Admin auth mode">
          <button
            className={`auth-switcher-button ${mode === "login" ? "active admin-accent" : ""}`}
            type="button"
            onClick={() => setMode("login")}
          >
            Log in
          </button>
          <button
            className={`auth-switcher-button ${mode === "register" ? "active admin-accent" : ""}`}
            type="button"
            onClick={() => setMode("register")}
          >
            Register
          </button>
        </div>

        <div className="auth-form-card">
          <div className="auth-form-card-topline">
            <span>{mode === "register" ? "Admin account creation" : "Protected admin sign in"}</span>
            <strong>{mode === "register" ? "Operations access" : "Control room access"}</strong>
          </div>

          <form className="auth-form auth-form-portal" onSubmit={handleSubmit}>
            {mode === "register" ? (
              <>
                <label className="form-field" htmlFor="fullName">
                  Full name
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  placeholder="Enter your full name"
                  value={form.fullName}
                  onChange={handleChange}
                  required
                />
              </>
            ) : null}

            <label className="form-field" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="Enter your admin email"
              value={form.email}
              onChange={handleChange}
              required
            />

            <label className="form-field" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Enter your password"
              value={form.password}
              onChange={handleChange}
              minLength={8}
              required
            />

            <button className="auth-button admin-button auth-submit-wide" type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "Saving..."
                : mode === "register"
                  ? "Create admin account"
                  : "Enter admin dashboard"}
            </button>
          </form>

          {status.message ? <p className={`form-status ${status.type}`}>{status.message}</p> : null}

          <div className="auth-form-footer-note">
            <span className="auth-form-footer-dot" />
            <p>Protected session access for administration tools</p>
          </div>
        </div>
      </section>
    </main>
  );
}
