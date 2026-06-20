import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { PlatformLayout, PlatformSection, PlatformStats } from "../../components/PlatformLayout";
import { getAuthHeaders, getStudentSession } from "../../utils/session";

const apiBaseUrl = import.meta.env.VITE_API_URL || "https://codingplatform-qf38.onrender.com/api";
const defaultProgress = [
  {
    difficulty: "easy",
    total_submissions: 0,
    accepted_submissions: 0,
    wrong_answer_submissions: 0,
    time_limit_submissions: 0,
    solved_problems: 0
  },
  {
    difficulty: "medium",
    total_submissions: 0,
    accepted_submissions: 0,
    wrong_answer_submissions: 0,
    time_limit_submissions: 0,
    solved_problems: 0
  },
  {
    difficulty: "hard",
    total_submissions: 0,
    accepted_submissions: 0,
    wrong_answer_submissions: 0,
    time_limit_submissions: 0,
    solved_problems: 0
  }
];

export default function StudentDashboard() {
  const location = useLocation();
  const [session] = useState(location.state?.session || getStudentSession());
  const user = session?.user;
  const [progress, setProgress] = useState(defaultProgress);
  const [progressStatus, setProgressStatus] = useState({
    loading: Boolean(user?.id),
    error: ""
  });
  const profile = user?.profile || null;

  function getProgressPercent(entry) {
    if (!entry.total_submissions) {
      return 0;
    }

    return Math.round((entry.accepted_submissions / entry.total_submissions) * 100);
  }

  useEffect(() => {
    let isMounted = true;

    async function loadProgress() {
      if (!user?.id || !session?.token) {
        setProgress(defaultProgress);
        setProgressStatus({
          loading: false,
          error: user?.id ? "Log in again to view protected progress data." : ""
        });
        return;
      }

      try {
        const response = await fetch(`${apiBaseUrl}/submissions/student/${user.id}/progress`, {
          headers: {
            ...getAuthHeaders(session.token)
          }
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Unable to load progress.");
        }

        if (isMounted) {
          setProgress(data);
          setProgressStatus({
            loading: false,
            error: ""
          });
        }
      } catch (error) {
        if (isMounted) {
          setProgressStatus({
            loading: false,
            error: error.message
          });
          setProgress(defaultProgress);
        }
      }
    }

    loadProgress();

    return () => {
      isMounted = false;
    };
  }, [session?.token, user?.id]);

  return (
    <PlatformLayout
      role="student"
      eyebrow="Student Dashboard"
      title={user ? `Welcome back, ${user.full_name}.` : "Student workspace"}
      subtitle={
        user
          ? `${profile?.branch || "Branch"} | Semester ${profile?.semester || "-"} | Section ${profile?.section || "-"} | Roll No. ${profile?.roll_number || "-"}. Signed in as ${user.email}.`
          : "Open the student login page to register or sign in."
      }
      meta="Student Portal"
      actions={
        <>
          <Link className="auth-button student-button panel-action-button" to="/student/courses">
            Open courses
          </Link>
          <Link className="auth-button ghost-button panel-action-button" to="/student/problems">
            Solve problems
          </Link>
        </>
      }
      sidebarNote="Use this area like a coding platform hub: open the problem set, keep an eye on your success rate, and return often to build momentum."
    >
      <PlatformStats
        items={[
          {
            label: "Solved problems",
            value: progress.reduce((sum, entry) => sum + (entry.solved_problems || 0), 0),
            note: "Unique problems cleared"
          },
          {
            label: "Section",
            value: profile?.section || "-",
            note: profile?.batch ? `Batch ${profile.batch}` : "Assigned section"
          },
          {
            label: "Accepted runs",
            value: progress.reduce((sum, entry) => sum + (entry.accepted_submissions || 0), 0),
            note: "Successful submissions"
          }
        ]}
      />

      <PlatformSection
        label="Assigned Courses"
        title="Open your semester and batch courses"
        actions={
          <Link className="auth-button student-button panel-action-button" to="/student/courses">
            View courses
          </Link>
        }
      >
        <p className="dashboard-copy">
          Your courses are filtered by branch, semester, section, and batch so the portal behaves
          more like a college LMS than a generic coding site.
        </p>
      </PlatformSection>

      <PlatformSection
        label="Problem Set"
        title="Start a focused practice session"
        actions={
          <Link className="auth-button student-button panel-action-button" to="/student/problems">
            Open problem list
          </Link>
        }
      >
        <p className="dashboard-copy">
          Move through the questions like a standard coding platform flow: pick a problem, read
          the statement, code in the workspace, and submit to see your verdict immediately.
        </p>
      </PlatformSection>

      <PlatformSection label="Performance" title="Submission status by difficulty">
        {!user?.id ? (
          <p className="dashboard-copy">
            Log in as a student and submit solutions to fill these progress meters.
          </p>
        ) : null}
        {progressStatus.loading ? <p className="dashboard-copy">Loading progress...</p> : null}
        {progressStatus.error ? <p className="form-status error">{progressStatus.error}</p> : null}
        {!progressStatus.loading && !progressStatus.error ? (
          <div className="progress-grid">
            {progress.map((entry) => (
              <article className="progress-card" key={entry.difficulty}>
                <span className={`difficulty-pill ${entry.difficulty}`}>{entry.difficulty}</span>
                <div className="progress-meter">
                  <div
                    className={`progress-meter-fill ${entry.difficulty}`}
                    style={{ width: `${getProgressPercent(entry)}%` }}
                  />
                </div>
                <span className="progress-percent">{getProgressPercent(entry)}% success</span>
                <strong>{entry.accepted_submissions} accepted</strong>
                <p>{entry.total_submissions} submissions total</p>
                <p>{entry.solved_problems} solved problems</p>
                <p>{entry.wrong_answer_submissions} wrong answer</p>
                <p>{entry.time_limit_submissions} time limit</p>
              </article>
            ))}
          </div>
        ) : null}
      </PlatformSection>

    </PlatformLayout>
  );
}
