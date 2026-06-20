import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PlatformLayout, PlatformSection, PlatformStats } from "../../components/PlatformLayout";
import { apiRequest } from "../../utils/api";

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
  difficulty: "medium",
  inputFormat: "",
  outputFormat: "",
  constraintsText: "",
  examplesText: ""
};

const blankTestCase = {
  input_data: "",
  expected_output: ""
};

function formatDateTime(value) {
  if (!value) {
    return "No deadline";
  }

  return new Date(value).toLocaleString();
}

function getAudienceLabel(course) {
  return `${course.branchTargets.join(", ")} | Sem ${course.semesterTargets.join(", ")} | Sec ${course.sectionTargets.join(", ")}`;
}

export default function CourseWorkspace({ role, session }) {
  const { courseId } = useParams();
  const [data, setData] = useState(null);
  const [status, setStatus] = useState({
    loading: true,
    error: ""
  });
  const [assignmentForm, setAssignmentForm] = useState(initialAssignmentForm);
  const [materialForm, setMaterialForm] = useState(initialMaterialForm);
  const [problemForm, setProblemForm] = useState(initialProblemForm);
  const [sampleTestCases, setSampleTestCases] = useState([{ ...blankTestCase }]);
  const [hiddenTestCases, setHiddenTestCases] = useState([{ ...blankTestCase }]);
  const [actionStatus, setActionStatus] = useState({
    success: "",
    error: ""
  });

  const isAdmin = role === "admin";
  const isFaculty = role === "faculty";
  const accentButtonClass = isAdmin ? "admin-button" : "student-button";
  const accentRole = isAdmin ? "admin" : "faculty";
  const backToCoursesPath = isAdmin ? "/admin/courses" : "/faculty/courses";

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
      const finalSampleCases = sampleTestCases
        .map((tc, index) => ({
          input_data: tc.input_data.trim(),
          expected_output: tc.expected_output.trim(),
          sort_order: index
        }))
        .filter((tc) => tc.input_data || tc.expected_output);
      const finalHiddenCases = hiddenTestCases
        .map((tc, index) => ({
          input_data: tc.input_data.trim(),
          expected_output: tc.expected_output.trim(),
          sort_order: index
        }))
        .filter((tc) => tc.input_data || tc.expected_output);

      await apiRequest(
        `/courses/${courseId}/coding-problems`,
        {
          method: "POST",
          body: JSON.stringify({
            ...problemForm,
            sampleTestCases: finalSampleCases,
            hiddenTestCases: finalHiddenCases
          })
        },
        session?.token
      );
      setProblemForm(initialProblemForm);
      setSampleTestCases([{ ...blankTestCase }]);
      setHiddenTestCases([{ ...blankTestCase }]);
      setActionStatus({
        success: "Coding problem added to the course successfully.",
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

  const facultyActionCards = data
    ? [
        {
          title: "Assignment lane",
          metric: `${data.assignments.length} items`,
          note: "Publish, pace, and manage course work."
        },
        {
          title: "Resource lane",
          metric: `${data.materials.length} items`,
          note: "Upload notes, slides, and support material."
        },
        {
          title: "Practice lane",
          metric: `${data.codingProblems.length} items`,
          note: "Add coding work with visible and hidden cases."
        }
      ]
    : [];

  return (
    <PlatformLayout
      role={accentRole}
      eyebrow={isAdmin ? "Admin Course Workspace" : "Faculty Course Workspace"}
      title={data ? `${data.code} - ${data.title}` : "Course workspace"}
      subtitle={
        isAdmin
          ? "Review the full course setup, assign resources, and add coding questions that stay inside this course."
          : "Run day-to-day teaching from one workspace: publish tasks, share resources, manage practice, and follow student progress."
      }
      meta={isAdmin ? "Admin Managed Course" : "Faculty Delivery Hub"}
      actions={
        <Link className={`auth-button ${accentButtonClass} panel-action-button`} to={backToCoursesPath}>
          Back to courses
        </Link>
      }
      sidebarNote={
        isAdmin
          ? "Admins can configure the full course experience here, including assignments, study materials, and course-specific coding questions."
          : "Faculty access stays focused on delivery: admins control visibility and ownership, while faculty handle teaching content and learner follow-up."
      }
    >
      {status.loading ? <p className="dashboard-copy">Loading course workspace...</p> : null}
      {status.error ? <p className="form-status error">{status.error}</p> : null}
      {actionStatus.success ? <p className="form-status success">{actionStatus.success}</p> : null}
      {actionStatus.error ? <p className="form-status error">{actionStatus.error}</p> : null}

      {!status.loading && !status.error && data ? (
        <>
          <PlatformStats
            items={[
              {
                label: "Students",
                value: data.students.length,
                note: "Currently enrolled"
              },
              {
                label: "Assignments",
                value: data.assignments.length,
                note: "Published in this course"
              },
              {
                label: "Coding Problems",
                value: data.codingProblems.length,
                note: "Practice inside the course"
              }
            ]}
          />

          {isFaculty ? (
            <PlatformSection label="Course Studio" title="Teaching workbench for this course">
              <div className="faculty-workbench">
                <article className="faculty-workbench-main">
                  <span className="faculty-feature-label">Active course</span>
                  <h3>{data.code}</h3>
                  <p>{data.title}</p>
                  <div className="faculty-chip-row">
                    <span className="tag-pill">{getAudienceLabel(data)}</span>
                    <span className="tag-pill">Batch {data.batchTargets.join(", ")}</span>
                    <span className="tag-pill">{data.students.length} students</span>
                  </div>
                </article>
                <article className="faculty-workbench-side">
                  <strong>Assigned faculty</strong>
                  <p>{data.faculty.map((member) => member.fullName).join(", ") || "No faculty assigned"}</p>
                  <strong>Purpose</strong>
                  <p>Use this page to build, update, and manage the learning experience for this one course.</p>
                </article>
              </div>
              <div className="faculty-feature-grid">
                {facultyActionCards.map((card) => (
                  <article className="faculty-mini-panel" key={card.title}>
                    <strong>{card.title}</strong>
                    <span className="faculty-mini-metric">{card.metric}</span>
                    <p>{card.note}</p>
                  </article>
                ))}
              </div>
            </PlatformSection>
          ) : null}

          <PlatformSection label="Course Brief" title={isFaculty ? "Course context for publishing" : "Complete course details"}>
            <div className="history-list">
              <article className="history-card faculty-overview-card">
                <strong>Course description</strong>
                <p>{data.description || "No description added yet."}</p>
                <div className="faculty-chip-row">
                  <span className="tag-pill">{data.branchTargets.join(", ")}</span>
                  <span className="tag-pill">Sem {data.semesterTargets.join(", ")}</span>
                  <span className="tag-pill">Sec {data.sectionTargets.join(", ")}</span>
                  <span className="tag-pill">Batch {data.batchTargets.join(", ")}</span>
                </div>
                <p className="question-meta">
                  Faculty: {data.faculty.map((member) => member.fullName).join(", ") || "No faculty assigned"}
                </p>
              </article>
            </div>
          </PlatformSection>

          <PlatformSection label="Roster" title={isFaculty ? "Student list for this course" : "Enrolled students"}>
            {data.students.length === 0 ? <p className="dashboard-copy">No students enrolled yet.</p> : null}
            {data.students.length > 0 ? (
              <div className="table-shell">
                <table className="course-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.students.map((student) => (
                      <tr key={student.id}>
                        <td>{student.fullName}</td>
                        <td>{student.email}</td>
                        <td>
                          <Link className={`auth-button ${accentButtonClass} detail-link`} to={`/${accentRole}/students/${student.id}/submissions`}>
                            Review attempts
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </PlatformSection>

          <PlatformSection label="Assignments" title={isFaculty ? "Assignment stream" : "Current assignment list"}>
            {data.assignments.length === 0 ? <p className="dashboard-copy">No assignments published yet.</p> : null}
            {data.assignments.length > 0 ? (
              <div className="history-list">
                {data.assignments.map((assignment) => (
                  <article className="history-card faculty-list-card" key={assignment.id}>
                    <div className="question-card-top">
                      <span className="difficulty-pill medium">{assignment.type}</span>
                      <span className="question-meta">Max score {assignment.maxScore}</span>
                    </div>
                    <strong>{assignment.title}</strong>
                    <p>{assignment.description || "No assignment description provided."}</p>
                    <p className="question-meta">Due {formatDateTime(assignment.dueDate)}</p>
                  </article>
                ))}
              </div>
            ) : null}
          </PlatformSection>

          <PlatformSection label="Resources" title={isFaculty ? "Resource shelf" : "Uploaded resources"}>
            {data.materials.length === 0 ? <p className="dashboard-copy">No study material uploaded yet.</p> : null}
            {data.materials.length > 0 ? (
              <div className="history-list">
                {data.materials.map((material) => (
                  <article className="history-card faculty-list-card" key={material.id}>
                    <div className="question-card-top">
                      <span className="difficulty-pill medium">{material.type}</span>
                    </div>
                    <strong>{material.title}</strong>
                    <p>{material.description || "No description provided."}</p>
                    <a className="auth-button ghost-button detail-link" href={material.url} target="_blank" rel="noreferrer">
                      Open material
                    </a>
                  </article>
                ))}
              </div>
            ) : null}
          </PlatformSection>

          <PlatformSection label="Practice" title={isFaculty ? "Coding practice studio" : "Course question bank"}>
            {data.codingProblems.length === 0 ? <p className="dashboard-copy">No course coding problems yet.</p> : null}
            {data.codingProblems.length > 0 ? (
              <div className="history-list">
                {data.codingProblems.map((problem) => (
                  <article className="history-card faculty-list-card" key={problem.id}>
                    <div className="question-card-top">
                      <span className={`difficulty-pill ${problem.difficulty}`}>{problem.difficulty}</span>
                    </div>
                    <strong>{problem.title}</strong>
                    <p>{problem.statement}</p>
                    {problem.input_format ? <p className="question-meta">Input: {problem.input_format}</p> : null}
                    {problem.output_format ? <p className="question-meta">Output: {problem.output_format}</p> : null}
                    <p className="question-meta">
                      Sample cases: {problem.sampleTestCases?.length || 0}
                      {isAdmin || isFaculty ? ` | Hidden cases: ${problem.hiddenTestCases?.length || 0}` : ""}
                    </p>
                    <Link className={`auth-button ${accentButtonClass} detail-link`} to={`/${accentRole}/courses/${courseId}/problems/${problem.id}`}>
                      Open problem workspace
                    </Link>
                  </article>
                ))}
              </div>
            ) : null}
          </PlatformSection>

          {isFaculty ? (
            <PlatformSection label="Teaching Actions" title="Choose the kind of course work you want to build">
              <div className="faculty-builder-grid">
                <article className="faculty-focus-item">
                  <strong>Build an assignment</strong>
                  <p>Create the next classroom task with due dates, score limits, and instructions for this course only.</p>
                </article>
                <article className="faculty-focus-item">
                  <strong>Add teaching material</strong>
                  <p>Upload support content students can open immediately while studying this subject.</p>
                </article>
                <article className="faculty-focus-item">
                  <strong>Create coding practice</strong>
                  <p>Write course-specific problems with sample cases for learning and hidden cases for evaluation.</p>
                </article>
              </div>
            </PlatformSection>
          ) : null}

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
              <button className={`auth-button ${accentButtonClass}`} type="submit">
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
              <button className={`auth-button ${accentButtonClass}`} type="submit">
                Upload material
              </button>
            </form>
          </PlatformSection>

          <PlatformSection label="Add Question" title="Add a coding question to this course">
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
              <textarea
                rows="4"
                placeholder="Input format"
                value={problemForm.inputFormat}
                onChange={(event) => setProblemForm((current) => ({ ...current, inputFormat: event.target.value }))}
              />
              <textarea
                rows="4"
                placeholder="Output format"
                value={problemForm.outputFormat}
                onChange={(event) => setProblemForm((current) => ({ ...current, outputFormat: event.target.value }))}
              />
              <textarea
                rows="4"
                placeholder="Constraints"
                value={problemForm.constraintsText}
                onChange={(event) => setProblemForm((current) => ({ ...current, constraintsText: event.target.value }))}
              />
              <textarea
                rows="4"
                placeholder="Examples or walkthrough"
                value={problemForm.examplesText}
                onChange={(event) => setProblemForm((current) => ({ ...current, examplesText: event.target.value }))}
              />

              <div className="history-card">
                <strong>Sample Test Cases</strong>
                <p className="question-meta">These are visible to students and used by the Run Code action.</p>
                {sampleTestCases.map((testCase, index) => (
                  <div className="course-test-case-grid" key={`sample-${index}`}>
                    <textarea
                      rows="4"
                      placeholder={`Sample input #${index + 1}`}
                      value={testCase.input_data}
                      onChange={(event) =>
                        setSampleTestCases((current) =>
                          current.map((entry, entryIndex) =>
                            entryIndex === index ? { ...entry, input_data: event.target.value } : entry
                          )
                        )
                      }
                    />
                    <textarea
                      rows="4"
                      placeholder={`Expected output #${index + 1}`}
                      value={testCase.expected_output}
                      onChange={(event) =>
                        setSampleTestCases((current) =>
                          current.map((entry, entryIndex) =>
                            entryIndex === index ? { ...entry, expected_output: event.target.value } : entry
                          )
                        )
                      }
                    />
                    {sampleTestCases.length > 1 ? (
                      <button
                        className={`auth-button ${accentButtonClass}`}
                        type="button"
                        onClick={() => setSampleTestCases((current) => current.filter((_, entryIndex) => entryIndex !== index))}
                      >
                        Remove sample
                      </button>
                    ) : null}
                  </div>
                ))}
                <button
                  className={`auth-button ${accentButtonClass}`}
                  type="button"
                  onClick={() => setSampleTestCases((current) => [...current, { ...blankTestCase }])}
                >
                  Add sample test case
                </button>
              </div>

              <div className="history-card">
                <strong>Hidden Test Cases</strong>
                <p className="question-meta">These are checked during final submission and are not shown to students.</p>
                {hiddenTestCases.map((testCase, index) => (
                  <div className="course-test-case-grid" key={`hidden-${index}`}>
                    <textarea
                      rows="4"
                      placeholder={`Hidden input #${index + 1}`}
                      value={testCase.input_data}
                      onChange={(event) =>
                        setHiddenTestCases((current) =>
                          current.map((entry, entryIndex) =>
                            entryIndex === index ? { ...entry, input_data: event.target.value } : entry
                          )
                        )
                      }
                    />
                    <textarea
                      rows="4"
                      placeholder={`Expected output #${index + 1}`}
                      value={testCase.expected_output}
                      onChange={(event) =>
                        setHiddenTestCases((current) =>
                          current.map((entry, entryIndex) =>
                            entryIndex === index ? { ...entry, expected_output: event.target.value } : entry
                          )
                        )
                      }
                    />
                    {hiddenTestCases.length > 1 ? (
                      <button
                        className={`auth-button ${accentButtonClass}`}
                        type="button"
                        onClick={() => setHiddenTestCases((current) => current.filter((_, entryIndex) => entryIndex !== index))}
                      >
                        Remove hidden
                      </button>
                    ) : null}
                  </div>
                ))}
                <button
                  className={`auth-button ${accentButtonClass}`}
                  type="button"
                  onClick={() => setHiddenTestCases((current) => [...current, { ...blankTestCase }])}
                >
                  Add hidden test case
                </button>
              </div>

              <button className={`auth-button ${accentButtonClass}`} type="submit">
                Add coding question
              </button>
            </form>
          </PlatformSection>
        </>
      ) : null}
    </PlatformLayout>
  );
}
