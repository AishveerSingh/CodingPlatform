import { Link, useLocation, useNavigate } from "react-router-dom";
import { clearStudentSession, clearFacultySession, clearAdminSession } from "../utils/session";

const navItemsByRole = {
  student: [
    { to: "/student/dashboard", label: "Dashboard" },
    { to: "/student/courses", label: "Courses" },
    { to: "/student/problems", label: "Practice" },
    { to: "/student/account", label: "Account" }
  ],
  faculty: [
    { to: "/faculty/dashboard", label: "Dashboard" },
    { to: "/faculty/courses", label: "Courses" },
    { to: "/faculty/students", label: "Students" },
    { to: "/faculty/account", label: "Account" }
  ],
  admin: [
    { to: "/admin/dashboard", label: "Dashboard" },
    { to: "/admin/courses", label: "Courses" },
    { to: "/admin/faculty", label: "Faculty" },
    { to: "/admin/admins", label: "Admins" },
    { to: "/admin/problems", label: "Problem Bank" },
    { to: "/admin/problems/new", label: "Add Problem" },
    { to: "/admin/students", label: "Students" },
    { to: "/admin/account", label: "Account" }
  ]
};

function isItemActive(pathname, target) {
  return pathname === target || pathname.startsWith(`${target}/`);
}

export function PlatformLayout({
  role = "student",
  eyebrow,
  title,
  subtitle,
  meta,
  actions,
  children,
  sidebarNote
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const navItems = navItemsByRole[role] ?? [];

  const handleLogout = () => {
    if (role === "student") {
      clearStudentSession();
      navigate("/student/login");
    } else if (role === "faculty") {
      clearFacultySession();
      navigate("/faculty/login");
    } else if (role === "admin") {
      clearAdminSession();
      navigate("/admin/login");
    }
  };

  return (
    <main className={`platform-page ${role}-platform-page`}>
      <aside className="platform-sidebar">
        <Link className="platform-brand" to="/">
          <span className="platform-brand-mark">
            {role === "admin" ? "ProCoder Admin" : role === "faculty" ? "ProCoder Faculty" : "ProCoder Student"}
          </span>
          <strong>ProCoder Platform</strong>
        </Link>

        <div className="platform-sidebar-copy">
          <p className="platform-sidebar-label">
            {role === "admin" ? "Operations" : role === "faculty" ? "Teaching" : "Practice"}
          </p>
          <h2>
            {role === "admin"
              ? "Run the academic coding portal like an operations desk."
              : role === "faculty"
                ? "Teach through assigned sections, labs, and coursework."
                : "Practice through a campus coding workspace."}
          </h2>
          <p>{sidebarNote}</p>
        </div>

        <nav className="platform-nav" aria-label={`${role} navigation`}>
          {navItems.map((item) => (
            <Link
              className={`platform-nav-item ${isItemActive(location.pathname, item.to) ? "active" : ""}`}
              key={item.to}
              to={item.to}
            >
              {item.label}
            </Link>
          ))}
          <button
            onClick={handleLogout}
            className="platform-nav-item platform-logout-btn"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Logout
          </button>
        </nav>
      </aside>

      <section className="platform-main">
        <header className="platform-hero">
          <div className="platform-hero-copy">
            {eyebrow ? <p className="platform-eyebrow">{eyebrow}</p> : null}
            <h1>{title}</h1>
            {subtitle ? <p className="platform-hero-text">{subtitle}</p> : null}
          </div>
          <div className="platform-hero-side">
            {meta ? <div className="platform-meta-chip">{meta}</div> : null}
            {actions ? <div className="platform-hero-actions">{actions}</div> : null}
          </div>
        </header>

        <div className="platform-content">{children}</div>
      </section>
    </main>
  );
}

export function PlatformSection({ title, label, actions, children }) {
  return (
    <section className="platform-section-card">
      <div className="platform-section-head">
        <div>
          {label ? <p className="platform-section-label">{label}</p> : null}
          <h2>{title}</h2>
        </div>
        {actions ? <div className="platform-section-actions">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function PlatformStats({ items }) {
  return (
    <div className="platform-stats-grid">
      {items.map((item) => (
        <article className="platform-stat-card" key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          {item.note ? <p>{item.note}</p> : null}
        </article>
      ))}
    </div>
  );
}
