import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PlatformLayout, PlatformSection } from "../../components/PlatformLayout";
import { apiRequest } from "../../utils/api";
import { getFacultySession } from "../../utils/session";

const initialAssignmentForm = {
  title: "",
  description: "",
  type: "coding",
  dueDate: "",
  maxScore: 100
};

const initialMaterialForm = {
  title: "",
  description: "",
  type: "notes",
  url: ""
};

const initialProblemForm = {
  title: "",
  statement: "",
  difficulty: "medium"
};

export default function FacultyCourseDetails() {
  const { courseId } = useParams();
  const session = getFacultySession();
  const [data, setData] = useState(null);
  const [status, setStatus] = useState({
    loading: true,
    error: ""
  });
  const [assignmentForm, setAssignmentForm] = useState(initialAssignmentForm);
  const [materialForm, setMaterialForm] = useState(initialMaterialForm);
  const [problemForm, setProblemForm] = useState(initialProblemForm);
  const [actionStatus, setActionStatus] = useState({
    success: "",
    error: ""
  });

  async function loadCourse() {
    setStatus((current) => ({
      ...current,
      loading: true
    }));

    try {
      const result = await apiRequest(`/courses/${courseId}`, {}, session?.token);
      setData(result.course);
      setStatus({
        loading: false,
        error: ""
      });
    } catch (error) {
      setStatus({
        loading: false,
        error: error.message
      });
    }
  }

  useEffect(() => {
    loadCourse();
  }, [courseId]);

  async function handleCreateAssignment(event) {
    event.preventDefault();

    try {
      await apiRequest(
        `/courses/${courseId}/assignments`,
        {
          method: "POST",
          body: JSON.stringify(assignmentForm)
        },
        session?.token
      );
      setAssignmentForm(initialAssignmentForm);
      setActionStatus({
        success: "Assignment created successfully.",
        error: ""
      });
      loadCourse();
    } catch (error) {
      setActionStatus({
        success: "",
        error: error.message
      });
    }
  }

  async function handleCreateMaterial(event) {
    event.preventDefault();

    try {
      await apiRequest(
        `/courses/${courseId}/materials`,
        {
          method: "POST",
          body: JSON.stringify(materialForm)
        },
        session?.token
      );
      setMaterialForm(initialMaterialForm);
      setActionStatus({
        success: "Study material uploaded successfully.",
        error: ""
      });
      loadCourse();
    } catch (error) {
      setActionStatus({
        success: "",
        error: error.message
      });
    }
  }

  async function handleCreateProblem(event) {
    event.preventDefault();

    try {
      await apiRequest(
        `/courses/${courseId}/coding-problems`,
        {
          method: "POST",
          body: JSON.stringify(problemForm)
        },
        session?.token
      );
      setProblemForm(initialProblemForm);
      setActionStatus({
        success: "Coding problem created successfully.",
        error: ""
      });
      loadCourse();
    } catch (error) {
      setActionStatus({
        success: "",
        error: error.message
      });
    }
  }

  return (
    <PlatformLayout
      role="faculty"
      eyebrow="Faculty Course"
      title={data ? `${data.code} - ${data.title}` : "Course workspace"}
      subtitle="Create assignments, publish course problems, upload material, and review the enrolled roster."
      meta="Assigned Faculty"
      sidebarNote="Faculty access is scoped to assigned courses only, so course creation stays with admins while content management stays with faculty."
    >
      {status.loading ? <p className="dashboard-copy">Loading course workspace...</p> : null}
      {status.error ? <p className="form-status error">{status.error}</p> : null}
      {actionStatus.success ? <p className="form-status success">{actionStatus.success}</p> : null}
      {actionStatus.error ? <p className="form-status error">{actionStatus.error}</p> : null}

      {!status.loading && !status.error && data ? (
        <>
          <PlatformSection label="Students" title="Enrolled students">
            {data.students.length === 0 ? <p className="dashboard-copy">No students enrolled yet.</p> : null}
            <div className="table-shell">
              <table className="course-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                  </tr>
                </thead>
                <tbody>
                  {data.students.map((student) => (
                    <tr key={student.id}>
                      <td>{student.fullName}</td>
                      <td>{student.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </PlatformSection>

          <PlatformSection label="Publish Assignment" title="Create a new assignment">
            <form className="auth-form course-form-grid" onSubmit={handleCreateAssignment}>
              <input
                placeholder="Assignment title"
                value={assignmentForm.title}
                onChange={(event) => setAssignmentForm((current) => ({ ...current, title: event.target.value }))}
                required
              />
              <select
                value={assignmentForm.type}
                onChange={(event) => setAssignmentForm((current) => ({ ...current, type: event.target.value }))}
              >
                <option value="coding">Coding</option>
                <option value="theory">Theory</option>
              </select>
              <input
                type="datetime-local"
                value={assignmentForm.dueDate}
                onChange={(event) => setAssignmentForm((current) => ({ ...current, dueDate: event.target.value }))}
              />
              <input
                type="number"
                min="1"
                max="100"
                value={assignmentForm.maxScore}
                onChange={(event) => setAssignmentForm((current) => ({ ...current, maxScore: event.target.value }))}
              />
              <textarea
                rows="4"
                placeholder="Assignment description"
                value={assignmentForm.description}
                onChange={(event) => setAssignmentForm((current) => ({ ...current, description: event.target.value }))}
              />
              <button className="auth-button student-button" type="submit">
                Create assignment
              </button>
            </form>
          </PlatformSection>

          <PlatformSection label="Study Material" title="Upload notes or references">
            <form className="auth-form course-form-grid" onSubmit={handleCreateMaterial}>
              <input
                placeholder="Material title"
                value={materialForm.title}
                onChange={(event) => setMaterialForm((current) => ({ ...current, title: event.target.value }))}
                required
              />
              <select
                value={materialForm.type}
                onChange={(event) => setMaterialForm((current) => ({ ...current, type: event.target.value }))}
              >
                <option value="notes">Notes</option>
                <option value="slides">Slides</option>
                <option value="video">Video</option>
                <option value="link">Link</option>
                <option value="document">Document</option>
              </select>
              <input
                placeholder="https://resource-link"
                value={materialForm.url}
                onChange={(event) => setMaterialForm((current) => ({ ...current, url: event.target.value }))}
                required
              />
              <textarea
                rows="4"
                placeholder="Material description"
                value={materialForm.description}
                onChange={(event) => setMaterialForm((current) => ({ ...current, description: event.target.value }))}
              />
              <button className="auth-button student-button" type="submit">
                Upload material
              </button>
            </form>
          </PlatformSection>

          <PlatformSection label="Coding Problems" title="Create a course problem">
            <form className="auth-form course-form-grid" onSubmit={handleCreateProblem}>
              <input
                placeholder="Problem title"
                value={problemForm.title}
                onChange={(event) => setProblemForm((current) => ({ ...current, title: event.target.value }))}
                required
              />
              <select
                value={problemForm.difficulty}
                onChange={(event) => setProblemForm((current) => ({ ...current, difficulty: event.target.value }))}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
              <textarea
                rows="6"
                placeholder="Problem statement"
                value={problemForm.statement}
                onChange={(event) => setProblemForm((current) => ({ ...current, statement: event.target.value }))}
                required
              />
              <button className="auth-button student-button" type="submit">
                Create coding problem
              </button>
            </form>
          </PlatformSection>
        </>
      ) : null}
    </PlatformLayout>
  );
}
