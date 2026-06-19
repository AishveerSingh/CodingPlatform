import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { PlatformLayout, PlatformSection, PlatformStats } from "../../components/PlatformLayout";
import { apiRequest } from "../../utils/api";
import { getFacultySession } from "../../utils/session";

export default function FacultyDashboard() {
  const location = useLocation();
  const [session] = useState(location.state?.session || getFacultySession());
  const user = session?.user;
  const [courses, setCourses] = useState([]);
  const [status, setStatus] = useState({
    loading: Boolean(session?.token),
    error: ""
  });

  useEffect(() => {
    let isMounted = true;

    async function loadCourses() {
      if (!session?.token) {
        setStatus({
          loading: false,
          error: "Log in as faculty to open assigned courses."
        });
        return;
      }

      try {
        const data = await apiRequest("/courses", {}, session.token);

        if (isMounted) {
          setCourses(data);
          setStatus({
            loading: false,
            error: ""
          });
        }
      } catch (error) {
        if (isMounted) {
          setStatus({
            loading: false,
            error: error.message
          });
        }
      }
    }

    loadCourses();
    return () => {
      isMounted = false;
    };
  }, [session?.token]);

  return (
    <PlatformLayout
      role="faculty"
      eyebrow="Faculty Dashboard"
      title={user ? `Welcome back, ${user.fullName || user.full_name}.` : "Faculty workspace"}
      subtitle="Manage only the courses assigned to you, publish content, and review enrolled students."
      meta="Teaching Mode"
      actions={
        <Link className="auth-button student-button panel-action-button" to="/faculty/courses">
          Open courses
        </Link>
      }
      sidebarNote="This faculty area is course-first: every action stays scoped to the courses you have actually been assigned."
    >
      <PlatformStats
        items={[
          {
            label: "Assigned courses",
            value: courses.length,
            note: "Visible to this faculty account"
          },
          {
            label: "Assignments",
            value: courses.reduce((sum, course) => sum + (course.assignmentCount || 0), 0),
            note: "Across all assigned courses"
          },
          {
            label: "Materials",
            value: courses.reduce((sum, course) => sum + (course.materialsCount || 0), 0),
            note: "Uploaded study resources"
          }
        ]}
      />

      <PlatformSection label="Assigned Courses" title="Your teaching load">
        {status.loading ? <p className="dashboard-copy">Loading assigned courses...</p> : null}
        {status.error ? <p className="form-status error">{status.error}</p> : null}
        {!status.loading && !status.error && courses.length === 0 ? (
          <p className="dashboard-copy">No courses are assigned to you yet.</p>
        ) : null}
        {!status.loading && !status.error && courses.length > 0 ? (
          <div className="course-grid">
            {courses.map((course) => (
              <article className="question-card course-card" key={course.id}>
                <div className="question-card-top">
                  <span className="difficulty-pill easy">{course.code}</span>
                  <span className="question-meta">{course.enrolledCount} students</span>
                </div>
                <h3>{course.title}</h3>
                <p>{course.description || "No course description has been added yet."}</p>
                <p className="question-meta">
                  {course.branchTargets.join(", ")} | Sem {course.semesterTargets.join(", ")} | Sec{" "}
                  {course.sectionTargets.join(", ")}
                </p>
                <Link className="auth-button student-button detail-link" to={`/faculty/courses/${course.id}`}>
                  Manage course
                </Link>
              </article>
            ))}
          </div>
        ) : null}
      </PlatformSection>
    </PlatformLayout>
  );
}
