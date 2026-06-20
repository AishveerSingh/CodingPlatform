import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { saveFacultySession } from "../../utils/session";
import { apiRequest } from "../../utils/api";

const initialForm = {
  email: "",
  password: ""
};

export default function FacultyLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState({
    type: "",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
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

    try {
      const data = await apiRequest("/auth/login/faculty", {
        method: "POST",
        body: JSON.stringify({
          email: form.email,
          password: form.password
        })
      });

      const session = {
        token: data.token,
        user: data.user
      };

      saveFacultySession(session);
      setForm(initialForm);
      setStatus({
        type: "success",
        message: data.message
      });

      navigate("/faculty/dashboard", {
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
    <main className="auth-page student-auth-page">
      <aside className="auth-side student-side">
        <p className="auth-side-label">Faculty workspace</p>
        <h2>Teach, publish, and review from a protected course delivery workspace.</h2>
        <p className="login-copy">
          Assigned faculty can manage their own courses, create assignments and coding problems,
          share materials, and review enrolled learners in one place.
        </p>
        <div className="auth-badge-row auth-badge-row-side">
          <span className="auth-badge">Assigned courses</span>
          <span className="auth-badge">Assignment authoring</span>
          <span className="auth-badge">Student roster</span>
        </div>
      </aside>

      <section className="auth-panel student-panel auth-entry-panel">
        <div className="auth-form-panel-header">
          <p className="auth-kicker">Faculty Access</p>
          <h1>Log in</h1>
          <p className="auth-form-panel-copy">
            Continue to your assigned course dashboard using the credentials assigned by admin.
          </p>
        </div>

        <div className="auth-form-card">
          <form className="auth-form auth-form-portal" onSubmit={handleSubmit}>
            <label className="form-field" htmlFor="faculty-email">
              Email
            </label>
            <input id="faculty-email" name="email" type="email" value={form.email} onChange={handleChange} required />

            <label className="form-field" htmlFor="faculty-password">
              Password
            </label>
            <input
              id="faculty-password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              minLength={8}
              required
            />

            <button className="auth-button student-button auth-submit-wide" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Signing in..." : "Enter faculty dashboard"}
            </button>
          </form>

          {status.message ? <p className={`form-status ${status.type}`}>{status.message}</p> : null}

          <div className="auth-form-footer-note">
            <span className="auth-form-footer-dot" />
            <p>Faculty accounts are created by admin with a college email and password</p>
          </div>
        </div>
      </section>
    </main>
  );
}
