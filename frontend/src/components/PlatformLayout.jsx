import { Link, useLocation } from "react-router-dom";

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
  const navItems = navItemsByRole[role] ?? [];

  return (
    <main className={`platform-page ${role}-platform-page`}>
      <aside className="platform-sidebar">
        <Link className="platform-brand" to="/">
          <span className="platform-brand-mark">
            {role === "admin" ? "CT Admin" : role === "faculty" ? "CT Faculty" : "CT Student"}
          </span>
          <strong>CodeTantra Style Portal</strong>
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
