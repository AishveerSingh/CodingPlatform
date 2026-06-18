import { Link } from "react-router-dom";
import AccountSection from "../../components/AccountSection";
import { PlatformLayout, PlatformSection, PlatformStats } from "../../components/PlatformLayout";
import { getStudentSession, saveStudentSession } from "../../utils/session";

export default function StudentAccountPage() {
  const session = getStudentSession();
  const user = session?.user;

  return (
    <PlatformLayout
      role="student"
      eyebrow="Account Settings"
      title={user ? `${user.full_name}'s profile` : "Student account"}
      subtitle="Manage your personal details and password from a dedicated account page instead of mixing it into the practice dashboard."
      meta="Profile Settings"
      actions={
        <Link className="auth-button student-button panel-action-button" to="/student/dashboard">
          Back to dashboard
        </Link>
      }
      sidebarNote="This is your account center: keep your profile details current and manage sign-in security without leaving the student workspace."
    >
      <PlatformStats
        items={[
          {
            label: "Full name",
            value: user?.full_name || "-",
            note: "Student profile name"
          },
          {
            label: "Email",
            value: user?.email || "-",
            note: "Current sign-in email"
          },
          {
            label: "Role",
            value: user?.role || "student",
            note: "Access type"
          }
        ]}
      />

      <PlatformSection label="Profile" title="Student account overview">
        <p className="dashboard-copy">
          Like other coding platforms, this page is dedicated to your account settings rather than
          problem-solving. Update your identity details or change your password here.
        </p>
      </PlatformSection>

      <AccountSection role="student" session={session} saveSession={saveStudentSession} />
    </PlatformLayout>
  );
}
