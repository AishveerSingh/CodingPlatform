import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { PlatformLayout, PlatformSection, PlatformStats } from "../../components/PlatformLayout";
import { getFacultySession } from "../../utils/session";

export default function FacultyDashboard() {
  const location = useLocation();
  const [session] = useState(location.state?.session || getFacultySession());
  const user = session?.user;
  const profile = user?.profile || null;

  return (
    <PlatformLayout
      role="faculty"
      eyebrow="Faculty Dashboard"
      title={user ? `${user.fullName || user.full_name}` : "Faculty profile"}
      subtitle={
        user
          ? `${profile?.designation || "Faculty"} | ${profile?.department || "Department not added"}`
          : "Faculty dashboard"
      }
      meta="Faculty Details"
      actions={
        <>
          <Link className="auth-button student-button panel-action-button" to="/faculty/account">
            Open account
          </Link>
          <Link className="auth-button ghost-button panel-action-button" to="/faculty/courses">
            Open courses
          </Link>
        </>
      }
      sidebarNote="This dashboard is personal to the faculty account and only shows profile-level information."
    >
      <PlatformStats
        items={[
          {
            label: "Faculty Role",
            value: profile?.designation || "Faculty",
            note: "Current designation"
          },
          {
            label: "Department",
            value: profile?.department || "-",
            note: "Academic department"
          },
          {
            label: "Employee ID",
            value: profile?.employee_id || "-",
            note: "Institute record"
          }
        ]}
      />

      <PlatformSection label="Profile" title="Faculty details">
        <div className="faculty-note-stack">
          <article className="faculty-note-card">
            <strong>Full name</strong>
            <p>{user?.fullName || user?.full_name || "-"}</p>
          </article>
          <article className="faculty-note-card">
            <strong>Email address</strong>
            <p>{user?.email || "-"}</p>
          </article>
          <article className="faculty-note-card">
            <strong>Designation</strong>
            <p>{profile?.designation || "-"}</p>
          </article>
          <article className="faculty-note-card">
            <strong>Department</strong>
            <p>{profile?.department || "-"}</p>
          </article>
          <article className="faculty-note-card">
            <strong>Employee ID</strong>
            <p>{profile?.employee_id || "-"}</p>
          </article>
        </div>
      </PlatformSection>
    </PlatformLayout>
  );
}
