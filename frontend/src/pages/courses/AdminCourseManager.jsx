import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
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

const javaCourseTemplate = {
  code: "JAVA-101",
  title: "Programming with Java",
  description:
    "A complete Java foundations course covering syntax, object-oriented programming, classes and objects, inheritance, polymorphism, exception handling, collections, file handling, multithreading, and practical problem-solving through coding exercises.",
  branchTargets: ["CSE"],
  semesterTargets: [3],
  sectionTargets: ["A"],
  batchTargets: ["2024-2028"],
  facultyIds: []
};

function withFallbackOptions(filterData) {
  return {
    branches: filterData.branches?.length ? filterData.branches : branchOptions,
    sections: filterData.sections?.length ? filterData.sections : sectionOptions,
    batches: filterData.batches?.length ? filterData.batches : initialForm.batchTargets,
    semesters: filterData.semesters?.length ? filterData.semesters : buildSemesterOptions(),
    faculty: filterData.faculty ?? []
  };
}

function PickerDropdown({
  value,
  options,
  onChange,
  placeholder,
  formatOption = (option) => option,
  getOptionValue = (option) => option,
  className = "filter-select"
}) {
  const dropdownRef = useRef(null);
  const selectedOption = options.find((option) => String(getOptionValue(option)) === String(value));

  function handleSelect(option) {
    onChange(getOptionValue(option));
    dropdownRef.current?.removeAttribute("open");
  }

  return (
    <details className={`custom-select ${className}`} ref={dropdownRef}>
      <summary className="custom-select-trigger">{selectedOption ? formatOption(selectedOption) : placeholder}</summary>
      <div className="custom-select-menu">
        {options.length > 0 ? (
          options.map((option) => {
            const optionValue = getOptionValue(option);
            const isSelected = String(optionValue) === String(value);

            return (
              <button
                className={`custom-select-option${isSelected ? " active" : ""}`}
                key={String(optionValue)}
                type="button"
                onClick={() => handleSelect(option)}
              >
                {formatOption(option)}
              </button>
            );
          })
        ) : (
          <p className="custom-select-empty">No options available</p>
        )}
      </div>
    </details>
  );
}

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
  const [pickerValues, setPickerValues] = useState({
    branch: initialForm.branchTargets[0],
    semester: String(initialForm.semesterTargets[0]),
    section: initialForm.sectionTargets[0],
    batch: initialForm.batchTargets[0],
    facultyId: ""
  });
  const [status, setStatus] = useState({
    loading: true,
    error: "",
    success: ""
  });

  const selectedAudienceSummary = `${form.branchTargets.length} branch${form.branchTargets.length === 1 ? "" : "es"}, ${
    form.semesterTargets.length
  } semester${form.semesterTargets.length === 1 ? "" : "s"}, ${form.sectionTargets.length} section${
    form.sectionTargets.length === 1 ? "" : "s"
  }, ${form.batchTargets.length} batch${form.batchTargets.length === 1 ? "" : "es"}`;

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
      setFilters(withFallbackOptions(filterData));
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

  useEffect(() => {
    setPickerValues((current) => ({
      branch: filters.branches.includes(current.branch) ? current.branch : filters.branches[0] || "",
      semester: filters.semesters.some((semester) => String(semester) === current.semester)
        ? current.semester
        : String(filters.semesters[0] || ""),
      section: filters.sections.includes(current.section) ? current.section : filters.sections[0] || "",
      batch: filters.batches.includes(current.batch) ? current.batch : filters.batches[0] || initialForm.batchTargets[0],
      facultyId: filters.faculty.some((member) => member.id === current.facultyId) ? current.facultyId : ""
    }));
  }, [filters]);

  function addSelection(field, value) {
    if (!value && value !== 0) {
      return;
    }

    setForm((current) => ({
      ...current,
      [field]: current[field].includes(value) ? current[field] : [...current[field], value]
    }));
  }

  function removeSelection(field, value) {
    setForm((current) => ({
      ...current,
      [field]: current[field].filter((entry) => entry !== value)
    }));
  }

  function applyJavaCourseTemplate() {
    setForm((current) => ({
      ...current,
      ...javaCourseTemplate,
      branchTargets: filters.branches.includes("CSE") ? ["CSE"] : [filters.branches[0] || branchOptions[0]],
      semesterTargets: filters.semesters.includes(3) ? [3] : [filters.semesters[0] || 1],
      sectionTargets: filters.sections.includes("A") ? ["A"] : [filters.sections[0] || sectionOptions[0]],
      batchTargets: filters.batches.length > 0 ? [filters.batches[0]] : javaCourseTemplate.batchTargets,
      facultyIds: current.facultyIds
    }));
    setPickerValues((current) => ({
      ...current,
      branch: filters.branches.includes("CSE") ? "CSE" : filters.branches[0] || branchOptions[0],
      semester: String(filters.semesters.includes(3) ? 3 : filters.semesters[0] || 1),
      section: filters.sections.includes("A") ? "A" : filters.sections[0] || sectionOptions[0],
      batch: filters.batches[0] || javaCourseTemplate.batchTargets[0]
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
    setPickerValues((current) => ({
      ...current,
      branch: course.branchTargets[0] || filters.branches[0] || branchOptions[0],
      semester: String(course.semesterTargets[0] || filters.semesters[0] || 1),
      section: course.sectionTargets[0] || filters.sections[0] || sectionOptions[0],
      batch: course.batchTargets[0] || filters.batches[0] || initialForm.batchTargets[0],
      facultyId: course.faculty[0]?.id || ""
    }));
  }

  return (
    <PlatformLayout
      role="admin"
      eyebrow="Course Management"
      title="Batch-wise course management"
      subtitle="Assign faculty and choose exactly which branch, semester, section, and batch of students can see each course."
      meta="Admin Control"
      sidebarNote="Admin controls course visibility here. Students outside the selected semester, section, branch, or batch cannot see or open the course."
    >
      <PlatformSection label="Course Builder" title={editingCourseId ? "Edit course" : "Create course"}>
        <div className="platform-section-actions">
          <button className="auth-button admin-button panel-action-button" type="button" onClick={applyJavaCourseTemplate}>
            Load Java course template
          </button>
        </div>
        <form className="auth-form course-form-grid" onSubmit={handleSubmit}>
          <div className="course-builder-top-grid">
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
          </div>

          <textarea
            rows="4"
            placeholder="Course description"
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
          />

          <div className="selection-grid audience-selection-grid">
            <div className="selection-card">
              <strong>Branches</strong>
              <div className="selection-inline">
                <PickerDropdown
                  className="filter-select"
                  value={pickerValues.branch}
                  placeholder="Select branch"
                  onChange={(value) =>
                    setPickerValues((current) => ({
                      ...current,
                      branch: value
                    }))
                  }
                  options={filters.branches}
                />
                <button
                  className="auth-button admin-button compact-button"
                  type="button"
                  onClick={() => addSelection("branchTargets", pickerValues.branch)}
                  disabled={!pickerValues.branch}
                >
                  Add
                </button>
              </div>
              {filters.branches.length === 0 ? <p className="dashboard-copy">No branch options available.</p> : null}
              <div className="pill-row selection-pill-row">
                {form.branchTargets.map((branch) => (
                  <button
                    className="selection-pill"
                    key={branch}
                    type="button"
                    onClick={() => removeSelection("branchTargets", branch)}
                  >
                    {branch} <span>Remove</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="selection-card">
              <strong>Semesters allowed to view</strong>
              <div className="selection-inline">
                <PickerDropdown
                  className="filter-select"
                  value={pickerValues.semester}
                  placeholder="Select semester"
                  formatOption={(semester) => `Semester ${semester}`}
                  onChange={(value) =>
                    setPickerValues((current) => ({
                      ...current,
                      semester: String(value)
                    }))
                  }
                  options={filters.semesters}
                />
                <button
                  className="auth-button admin-button compact-button"
                  type="button"
                  onClick={() => addSelection("semesterTargets", Number(pickerValues.semester))}
                  disabled={!pickerValues.semester}
                >
                  Add
                </button>
              </div>
              {filters.semesters.length === 0 ? <p className="dashboard-copy">No semester options available.</p> : null}
              <div className="pill-row selection-pill-row">
                {form.semesterTargets.map((semester) => (
                  <button
                    className="selection-pill"
                    key={semester}
                    type="button"
                    onClick={() => removeSelection("semesterTargets", semester)}
                  >
                    Semester {semester} <span>Remove</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="selection-card">
              <strong>Sections</strong>
              <div className="selection-inline">
                <PickerDropdown
                  className="filter-select"
                  value={pickerValues.section}
                  placeholder="Select section"
                  formatOption={(section) => `Section ${section}`}
                  onChange={(value) =>
                    setPickerValues((current) => ({
                      ...current,
                      section: value
                    }))
                  }
                  options={filters.sections}
                />
                <button
                  className="auth-button admin-button compact-button"
                  type="button"
                  onClick={() => addSelection("sectionTargets", pickerValues.section)}
                  disabled={!pickerValues.section}
                >
                  Add
                </button>
              </div>
              {filters.sections.length === 0 ? <p className="dashboard-copy">No section options available.</p> : null}
              <div className="pill-row selection-pill-row">
                {form.sectionTargets.map((section) => (
                  <button
                    className="selection-pill"
                    key={section}
                    type="button"
                    onClick={() => removeSelection("sectionTargets", section)}
                  >
                    Section {section} <span>Remove</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="course-builder-summary-card">
            <p className="dashboard-copy">
              Current audience: {selectedAudienceSummary}. Only students matching all selected academic filters will be enrolled and able to see this course.
            </p>
          </div>

          <div className="selection-card">
            <strong>Student batches</strong>
            <div className="selection-inline">
              <PickerDropdown
                className="filter-select"
                value={pickerValues.batch}
                placeholder="Select batch"
                onChange={(value) =>
                  setPickerValues((current) => ({
                    ...current,
                    batch: value
                  }))
                }
                options={filters.batches}
              />
              <button
                className="auth-button admin-button compact-button"
                type="button"
                onClick={() => addSelection("batchTargets", pickerValues.batch)}
                disabled={!pickerValues.batch}
              >
                Add
              </button>
            </div>
            <input
              placeholder="Add a custom batch value if needed"
              value={pickerValues.batch}
              onChange={(event) =>
                setPickerValues((current) => ({
                  ...current,
                  batch: event.target.value
                }))
              }
            />
            <div className="pill-row selection-pill-row">
              {form.batchTargets.map((batch) => (
                <button
                  className="selection-pill"
                  key={batch}
                  type="button"
                  onClick={() => removeSelection("batchTargets", batch)}
                >
                  {batch} <span>Remove</span>
                </button>
              ))}
            </div>
          </div>

          <div className="selection-card">
            <strong>Assigned faculty</strong>
            <div className="selection-inline">
              <PickerDropdown
                className="filter-select"
                value={pickerValues.facultyId}
                placeholder="Select faculty"
                formatOption={(member) => `${member.fullName} (${member.email})`}
                getOptionValue={(member) => member.id}
                onChange={(value) =>
                  setPickerValues((current) => ({
                    ...current,
                    facultyId: value
                  }))
                }
                options={filters.faculty}
              />
              <button
                className="auth-button admin-button compact-button"
                type="button"
                onClick={() => addSelection("facultyIds", pickerValues.facultyId)}
                disabled={!pickerValues.facultyId}
              >
                Add
              </button>
            </div>
            {filters.faculty.length === 0 ? (
              <p className="dashboard-copy">No faculty accounts found yet. Create faculty accounts first, then assign them here.</p>
            ) : null}
            <div className="pill-row selection-pill-row">
              {form.facultyIds.map((facultyId) => {
                const member = filters.faculty.find((entry) => entry.id === facultyId);

                return (
                  <button
                    className="selection-pill"
                    key={facultyId}
                    type="button"
                    onClick={() => removeSelection("facultyIds", facultyId)}
                  >
                    {member ? member.fullName : facultyId} <span>Remove</span>
                  </button>
                );
              })}
            </div>
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
                  {course.branchTargets.join(", ")} | Sem {course.semesterTargets.join(", ")} | Sec{" "}
                  {course.sectionTargets.join(", ")} | Batches {course.batchTargets.join(", ")}
                </p>
                <p className="question-meta">
                  Visible only to selected students. Faculty: {course.faculty.map((member) => member.fullName).join(", ")}
                </p>
                <div className="platform-section-actions">
                  <Link className="auth-button admin-button detail-link" to={`/admin/courses/${course.id}`}>
                    Manage course
                  </Link>
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
