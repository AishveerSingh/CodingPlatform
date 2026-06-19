import { Link } from "react-router-dom";

const languages = [
  {
    name: "C++",
    summary: "Fast problem-solving for contests, data structures, and systems thinking."
  },
  {
    name: "Java",
    summary: "Reliable object-oriented workflows for structured coding rounds and backend logic."
  },
  {
    name: "Python",
    summary: "Readable syntax for algorithms, automation, and rapid experimentation."
  },
  {
    name: "JavaScript",
    summary: "Full-stack practice from logic building to interactive frontend projects."
  }
];

export default function HomePage() {
  return (
    <main className="landing-page">
      <section className="landing-shell">
        <div className="landing-hero">
          <p className="landing-kicker">Coding Platform</p>
          <h1>Train, review, and manage coding workflows in a workspace inspired by modern challenge platforms.</h1>
          <p className="landing-copy">
            Choose whether you are a student, faculty member, or admin, then move into a role-based
            workflow with coding practice, batch-wise course access, teaching tools, and protected
            administrative controls.
          </p>

          <div className="landing-stat-strip">
            <article>
              <span>Workspace</span>
              <strong>Problem + editor + verdict flow</strong>
            </article>
            <article>
              <span>Roles</span>
              <strong>Student, faculty, and admin paths</strong>
            </article>
            <article>
              <span>Supported</span>
              <strong>C++, Java, Python, JavaScript</strong>
            </article>
          </div>

          <div className="landing-actions landing-actions-three">
            <Link className="landing-role-card student-role-card" to="/student/login">
              <span className="landing-role-label">Student</span>
              <strong>Open student login</strong>
              <p>Practice questions, open problem details, and build regular coding habits.</p>
            </Link>

            <Link className="landing-role-card student-role-card" to="/faculty/login">
              <span className="landing-role-label">Faculty</span>
              <strong>Open faculty login</strong>
              <p>Manage assigned courses, publish study material, and review enrolled students.</p>
            </Link>

            <Link className="landing-role-card admin-role-card" to="/admin/login">
              <span className="landing-role-label">Admin</span>
              <strong>Open admin login</strong>
              <p>Create and assign courses, manage faculty mapping, and control platform flow.</p>
            </Link>
          </div>
        </div>

        <section className="language-panel">
          <div className="language-panel-header">
            <p className="landing-kicker">Languages</p>
            <h2>Core tracks available on the platform</h2>
          </div>

          <div className="language-grid">
            {languages.map((language) => (
              <article className="language-card" key={language.name}>
                <h3>{language.name}</h3>
                <p>{language.summary}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="language-panel landing-feature-panel">
          <div className="language-panel-header">
            <p className="landing-kicker">Platform Flow</p>
            <h2>What the product now feels like</h2>
          </div>

          <div className="card-grid">
            <article className="feature-card">
              <h2>Problem-first workspace</h2>
              <p>Students open a structured prompt with examples, requirements, editor, and live verdicts in one view.</p>
            </article>
            <article className="feature-card">
              <h2>Dashboard-driven practice</h2>
              <p>Students and admins both get role-specific overview screens with stats, actions, and quick navigation.</p>
            </article>
            <article className="feature-card">
              <h2>Professional review tools</h2>
              <p>Admins can search problems, review students, and inspect attempt history more like a real assessment platform.</p>
            </article>
          </div>
        </section>
      </section>
    </main>
  );
}
