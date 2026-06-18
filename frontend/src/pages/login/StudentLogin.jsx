import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { saveStudentSession } from "../../utils/session";

const apiBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const initialForm = {
  fullName: "",
  email: "",
  password: ""
};
const studentHighlights = [
  "Structured problem statements",
  "Language-based coding workspace",
  "Instant submission verdicts"
];

export default function StudentLogin() {
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

    const endpoint = mode === "register" ? "/users/student-register" : "/users/student-login";
    const payload =
      mode === "register"
        ? form
        : {
            email: form.email,
            password: form.password
          };

    try {
      const response = await fetch(`${apiBaseUrl}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to authenticate student.");
      }

      const session = {
        token: data.token,
        user: data.user
      };

      saveStudentSession(session);
      setForm(initialForm);
      setStatus({
        type: "success",
        message: data.message
      });

      navigate("/student/dashboard", {
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
        <p className="auth-side-label">Student space</p>
        <h2>Train in a workspace that feels closer to real coding platforms.</h2>
        <p className="login-copy">
          Move from sign-in to a structured problem bank, editor-first solving flow, and a clean
          verdict history built for regular practice.
        </p>
        <div className="auth-badge-row auth-badge-row-side">
          <span className="auth-badge">Problem workspace</span>
          <span className="auth-badge">Submission verdicts</span>
          <span className="auth-badge">Progress dashboard</span>
        </div>
        <div className="auth-feature-list">
          {studentHighlights.map((highlight) => (
            <article className="auth-feature-item" key={highlight}>
              <span className="auth-feature-dot" />
              <p>{highlight}</p>
            </article>
          ))}
        </div>
        <div className="auth-side-metrics">
          <article>
            <span>Experience</span>
            <strong>Problem bank</strong>
          </article>
          <article>
            <span>Feedback</span>
            <strong>Runtime verdicts</strong>
          </article>
        </div>
      </aside>

      <section className="auth-panel student-panel auth-entry-panel">
        <div className="auth-form-panel-header">
          <p className="auth-kicker">Student Access</p>
          <h1>{mode === "register" ? "Register" : "Log in"}</h1>
          <p className="auth-form-panel-copy">
            {mode === "register"
              ? "Create your student account to start solving problems."
              : "Continue to your practice dashboard and coding workspace."}
          </p>
        </div>

        <div className="auth-switcher" role="tablist" aria-label="Student auth mode">
          <button
            className={`auth-switcher-button ${mode === "login" ? "active student-accent" : ""}`}
            type="button"
            onClick={() => setMode("login")}
          >
            Log in
          </button>
          <button
            className={`auth-switcher-button ${mode === "register" ? "active student-accent" : ""}`}
            type="button"
            onClick={() => setMode("register")}
          >
            Register
          </button>
        </div>

        <div className="auth-form-card">
          <div className="auth-form-card-topline">
            <span>{mode === "register" ? "New student profile" : "Secure student sign in"}</span>
            <strong>{mode === "register" ? "Account setup" : "Welcome back"}</strong>
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
              placeholder="Enter your email"
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

            <button className="auth-button student-button auth-submit-wide" type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "Saving..."
                : mode === "register"
                  ? "Create student account"
                  : "Enter student dashboard"}
            </button>
          </form>

          {status.message ? <p className={`form-status ${status.type}`}>{status.message}</p> : null}

          <div className="auth-form-footer-note">
            <span className="auth-form-footer-dot" />
            <p>Protected session access for the student workspace</p>
          </div>
        </div>
      </section>
    </main>
  );
}
