import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { saveFacultySession } from "../../utils/session";
import { apiRequest } from "../../utils/api";

const initialForm = {
  fullName: "",
  email: "",
  password: "",
  employeeId: "",
  department: "",
  designation: "Faculty"
};

export default function FacultyLogin() {
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
          mode === "register" ? "/auth/register/faculty" : "/auth/login/faculty",
          {
            method: "POST",
            body: JSON.stringify(authPayload)
          }
        );
      } catch (_error) {
        data = await apiRequest(
          mode === "register" ? "/users/faculty-register" : "/users/faculty-login",
          {
            method: "POST",
            body: JSON.stringify({
              fullName: form.fullName,
              email: form.email,
              password: form.password,
              employeeId: form.employeeId,
              department: form.department,
              designation: form.designation
            })
          }
        );
      }

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
          <h1>{mode === "register" ? "Register" : "Log in"}</h1>
          <p className="auth-form-panel-copy">
            {mode === "register"
              ? "Create a faculty account and connect it to your department."
              : "Continue to your assigned course dashboard."}
          </p>
        </div>

        <div className="auth-switcher" role="tablist" aria-label="Faculty auth mode">
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
          <form className="auth-form auth-form-portal" onSubmit={handleSubmit}>
            {mode === "register" ? (
              <>
                <label className="form-field" htmlFor="faculty-fullName">
                  Full name
                </label>
                <input id="faculty-fullName" name="fullName" value={form.fullName} onChange={handleChange} required />

                <label className="form-field" htmlFor="faculty-employeeId">
                  Employee ID
                </label>
                <input
                  id="faculty-employeeId"
                  name="employeeId"
                  value={form.employeeId}
                  onChange={handleChange}
                  required
                />

                <label className="form-field" htmlFor="faculty-department">
                  Department
                </label>
                <input
                  id="faculty-department"
                  name="department"
                  value={form.department}
                  onChange={handleChange}
                  placeholder="CSE"
                  required
                />

                <label className="form-field" htmlFor="faculty-designation">
                  Designation
                </label>
                <input
                  id="faculty-designation"
                  name="designation"
                  value={form.designation}
                  onChange={handleChange}
                />
              </>
            ) : null}

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
              {isSubmitting ? "Saving..." : mode === "register" ? "Create faculty account" : "Enter faculty dashboard"}
            </button>
          </form>

          {status.message ? <p className={`form-status ${status.type}`}>{status.message}</p> : null}
        </div>
      </section>
    </main>
  );
}
