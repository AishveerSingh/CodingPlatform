import { useEffect, useState } from "react";
import { PlatformLayout, PlatformSection } from "../../components/PlatformLayout";
import { apiRequest } from "../../utils/api";
import { getAdminSession } from "../../utils/session";
import { branchOptions, buildSemesterOptions, sectionOptions } from "../../types/course";

const initialForm = {
  code: "",
  title: "",
  description: "",
  branchTargets: ["CSE"],
  semesterTargets: [1],
  sectionTargets: ["A"],
  batchTargets: ["2024-2028"],
  facultyIds: []
};

export default function AdminCourseManager() {
  const session = getAdminSession();
  const [courses, setCourses] = useState([]);
  const [filters, setFilters] = useState({
    branches: branchOptions,
    sections: sectionOptions,
    batches: [],
    semesters: buildSemesterOptions(),
    faculty: []
  });
  const [form, setForm] = useState(initialForm);
  const [editingCourseId, setEditingCourseId] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState({
    loading: true,
    error: "",
    success: ""
  });

  async function loadData() {
    setStatus((current) => ({
      ...current,
      loading: true
    }));

    try {
      const [courseList, filterData] = await Promise.all([
        apiRequest(`/courses${search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ""}`, {}, session?.token),
        apiRequest("/courses/filters", {}, session?.token)
      ]);

      setCourses(courseList);
      setFilters(filterData);
      setStatus({
        loading: false,
        error: "",
        success: ""
      });
    } catch (error) {
      setStatus({
        loading: false,
        error: error.message,
        success: ""
      });
    }
  }

  useEffect(() => {
    loadData();
  }, [search]);

  function handleMultiSelect(field, value) {
    setForm((current) => ({
      ...current,
      [field]: current[field].includes(value)
        ? current[field].filter((entry) => entry !== value)
        : [...current[field], value]
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      const path = editingCourseId ? `/courses/${editingCourseId}` : "/courses";
      const method = editingCourseId ? "PUT" : "POST";
      const data = await apiRequest(
        path,
        {
          method,
          body: JSON.stringify(form)
        },
        session?.token
      );

      setStatus({
        loading: false,
        error: "",
        success: data.message
      });
      setForm(initialForm);
      setEditingCourseId("");
      loadData();
    } catch (error) {
      setStatus((current) => ({
        ...current,
        error: error.message,
        success: ""
      }));
    }
  }

  async function handleArchive(courseId) {
    try {
      const data = await apiRequest(
        `/courses/${courseId}`,
        {
          method: "DELETE"
        },
        session?.token
      );

      setStatus((current) => ({
        ...current,
        success: data.message,
        error: ""
      }));
      loadData();
    } catch (error) {
      setStatus((current) => ({
        ...current,
        error: error.message,
        success: ""
      }));
    }
  }

  function startEdit(course) {
    setEditingCourseId(course.id);
    setForm({
      code: course.code,
      title: course.title,
      description: course.description,
      branchTargets: course.branchTargets,
      semesterTargets: course.semesterTargets,
      sectionTargets: course.sectionTargets,
      batchTargets: course.batchTargets,
      facultyIds: course.faculty.map((member) => member.id)
    });
  }

  return (
    <PlatformLayout
      role="admin"
      eyebrow="Course Management"
      title="Batch-wise course management"
      subtitle="Create, edit, assign, and archive courses by branch, semester, section, and batch."
      meta="Admin Control"
      sidebarNote="Every course assignment is audience-based and then enforced again on course detail requests."
    >
      <PlatformSection label="Course Builder" title={editingCourseId ? "Edit course" : "Create course"}>
        <form className="auth-form course-form-grid" onSubmit={handleSubmit}>
          <input
            placeholder="Course code"
            value={form.code}
            onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))}
            required
          />
          <input
            placeholder="Course title"
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            required
          />
          <textarea
            rows="4"
            placeholder="Course description"
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
          />

          <div className="selection-grid">
            <div className="selection-card">
              <strong>Branches</strong>
              {filters.branches.map((branch) => (
                <label className="selection-option" key={branch}>
                  <input
                    type="checkbox"
                    checked={form.branchTargets.includes(branch)}
                    onChange={() => handleMultiSelect("branchTargets", branch)}
                  />
                  <span>{branch}</span>
                </label>
              ))}
            </div>

            <div className="selection-card">
              <strong>Semesters</strong>
              {filters.semesters.map((semester) => (
                <label className="selection-option" key={semester}>
                  <input
                    type="checkbox"
                    checked={form.semesterTargets.includes(semester)}
                    onChange={() => handleMultiSelect("semesterTargets", semester)}
                  />
                  <span>Semester {semester}</span>
                </label>
              ))}
            </div>

            <div className="selection-card">
              <strong>Sections</strong>
              {filters.sections.map((section) => (
                <label className="selection-option" key={section}>
                  <input
                    type="checkbox"
                    checked={form.sectionTargets.includes(section)}
                    onChange={() => handleMultiSelect("sectionTargets", section)}
                  />
                  <span>{section}</span>
                </label>
              ))}
            </div>
          </div>

          <input
            placeholder="Comma-separated batches, e.g. 2024-2028, 2025-2029"
            value={form.batchTargets.join(", ")}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                batchTargets: event.target.value
                  .split(",")
                  .map((entry) => entry.trim())
                  .filter(Boolean)
              }))
            }
          />

          <div className="selection-card">
            <strong>Assigned faculty</strong>
            {filters.faculty.map((member) => (
              <label className="selection-option" key={member.id}>
                <input
                  type="checkbox"
                  checked={form.facultyIds.includes(member.id)}
                  onChange={() => handleMultiSelect("facultyIds", member.id)}
                />
                <span>
                  {member.fullName} ({member.email})
                </span>
              </label>
            ))}
          </div>

          <div className="platform-section-actions">
            <button className="auth-button admin-button" type="submit">
              {editingCourseId ? "Save course" : "Create course"}
            </button>
            {editingCourseId ? (
              <button
                className="auth-button ghost-button"
                type="button"
                onClick={() => {
                  setEditingCourseId("");
                  setForm(initialForm);
                }}
              >
                Cancel edit
              </button>
            ) : null}
          </div>
        </form>
        {status.success ? <p className="form-status success">{status.success}</p> : null}
        {status.error ? <p className="form-status error">{status.error}</p> : null}
      </PlatformSection>

      <PlatformSection
        label="Course Directory"
        title="Live courses"
        actions={
          <input
            className="filter-input"
            placeholder="Search courses"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        }
      >
        {status.loading ? <p className="dashboard-copy">Loading courses...</p> : null}
        {!status.loading && courses.length === 0 ? (
          <p className="dashboard-copy">No courses created yet.</p>
        ) : null}
        {!status.loading && courses.length > 0 ? (
          <div className="course-grid">
            {courses.map((course) => (
              <article className="question-card course-card" key={course.id}>
                <div className="question-card-top">
                  <span className="difficulty-pill medium">{course.code}</span>
                  <span className="question-meta">{course.enrolledCount} enrolled</span>
                </div>
                <h3>{course.title}</h3>
                <p>{course.description || "No description added yet."}</p>
                <p className="question-meta">
                  {course.branchTargets.join(", ")} | Sem {course.semesterTargets.join(", ")} | Batches{" "}
                  {course.batchTargets.join(", ")}
                </p>
                <p className="question-meta">
                  Faculty: {course.faculty.map((member) => member.fullName).join(", ")}
                </p>
                <div className="platform-section-actions">
                  <button className="auth-button admin-button detail-link" type="button" onClick={() => startEdit(course)}>
                    Edit
                  </button>
                  <button className="auth-button danger-button detail-link" type="button" onClick={() => handleArchive(course.id)}>
                    Archive
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </PlatformSection>
    </PlatformLayout>
  );
}
