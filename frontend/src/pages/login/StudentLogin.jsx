import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { saveStudentSession } from "../../utils/session";
import { apiRequest } from "../../utils/api";

const initialForm = {
  fullName: "",
  email: "",
  password: "",
  rollNumber: "",
  branch: "CSE",
  semester: 1,
  section: "A",
  batch: "2024-2028"
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
          mode === "register" ? "/auth/register/student" : "/auth/login/student",
          {
            method: "POST",
            body: JSON.stringify(authPayload)
          }
        );
      } catch (error) {
        data = await apiRequest(
          mode === "register" ? "/users/student-register" : "/users/student-login",
          {
            method: "POST",
            body: JSON.stringify({
              fullName: form.fullName,
              email: form.email,
              password: form.password,
              rollNumber: form.rollNumber,
              branch: form.branch,
              semester: form.semester,
              section: form.section,
              batch: form.batch
            })
          }
        );
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

                <label className="form-field" htmlFor="rollNumber">
                  Roll number
                </label>
                <input
                  id="rollNumber"
                  name="rollNumber"
                  type="text"
                  placeholder="Enter your roll number"
                  value={form.rollNumber}
                  onChange={handleChange}
                  required
                />

                <label className="form-field" htmlFor="branch">
                  Branch
                </label>
                <input id="branch" name="branch" type="text" value={form.branch} onChange={handleChange} required />

                <label className="form-field" htmlFor="semester">
                  Semester
                </label>
                <input
                  id="semester"
                  name="semester"
                  type="number"
                  min={1}
                  max={12}
                  value={form.semester}
                  onChange={handleChange}
                  required
                />

                <label className="form-field" htmlFor="section">
                  Section
                </label>
                <input id="section" name="section" type="text" value={form.section} onChange={handleChange} required />

                <label className="form-field" htmlFor="batch">
                  Batch
                </label>
                <input id="batch" name="batch" type="text" value={form.batch} onChange={handleChange} required />
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
