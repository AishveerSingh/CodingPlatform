import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PlatformLayout, PlatformSection } from "../../components/PlatformLayout";
import { getAdminSession, getAuthHeaders } from "../../utils/session";

const apiBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const initialProblemForm = {
  title: "",
  difficulty: "easy",
  statement: "",
  inputFormat: "",
  outputFormat: "",
  constraintsText: "",
  examplesText: "",
  tagsText: "",
  sampleInput: "",
  sampleOutput: ""
};

export default function AdminProblemCreate() {
  const navigate = useNavigate();
  const session = getAdminSession();
  const [problemForm, setProblemForm] = useState(initialProblemForm);
  const [status, setStatus] = useState({
    message: "",
    error: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setProblemForm((currentForm) => ({
      ...currentForm,
      [name]: value
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus({
      message: "",
      error: ""
    });

    const tags = problemForm.tagsText
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    const sampleTestCases =
      problemForm.sampleInput.trim() && problemForm.sampleOutput.trim()
        ? [
            {
              input_data: problemForm.sampleInput,
              expected_output: problemForm.sampleOutput,
              sort_order: 0
            }
          ]
        : [];

    try {
      const response = await fetch(`${apiBaseUrl}/problems`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(session?.token)
        },
        body: JSON.stringify({
          title: problemForm.title,
          difficulty: problemForm.difficulty,
          statement: problemForm.statement,
          inputFormat: problemForm.inputFormat,
          outputFormat: problemForm.outputFormat,
          constraintsText: problemForm.constraintsText,
          examplesText: problemForm.examplesText,
          tags,
          sampleTestCases
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to add coding question.");
      }

      setStatus({
        message: data.message,
        error: ""
      });
      setProblemForm(initialProblemForm);

      navigate("/admin/problems", {
        state: {
          createdProblem: data.problem
        }
      });
    } catch (error) {
      setStatus({
        message: "",
        error: error.message
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <PlatformLayout
      role="admin"
      eyebrow="Problem Creation"
      title="Add a new coding question"
      subtitle="Write the prompt the way you would for a real practice or assessment platform: statement, requirements, tags, and sample cases."
      meta="Authoring Mode"
      sidebarNote="This screen is your authoring studio for the problem bank. Capture the prompt clearly so students can solve it with minimal ambiguity."
    >
      <PlatformSection label="Authoring Form" title="Create a polished problem statement">
        {!session?.token ? (
          <p className="form-status error">Log in as an admin to create questions.</p>
        ) : null}

        <form className="auth-form admin-problem-form" onSubmit={handleSubmit}>
          <label className="form-field" htmlFor="title">
            Question title
          </label>
          <input
            id="title"
            name="title"
            type="text"
            placeholder="Enter the coding question title"
            value={problemForm.title}
            onChange={handleChange}
            required
          />

          <label className="form-field" htmlFor="difficulty">
            Difficulty
          </label>
          <select
            id="difficulty"
            name="difficulty"
            value={problemForm.difficulty}
            onChange={handleChange}
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>

          <label className="form-field" htmlFor="tagsText">
            Tags
          </label>
          <input
            id="tagsText"
            name="tagsText"
            type="text"
            placeholder="array, loops, greedy"
            value={problemForm.tagsText}
            onChange={handleChange}
          />

          <label className="form-field" htmlFor="statement">
            Problem statement
          </label>
          <textarea
            id="statement"
            name="statement"
            placeholder="Describe the problem for students"
            value={problemForm.statement}
            onChange={handleChange}
            rows="6"
            required
          />

          <label className="form-field" htmlFor="inputFormat">
            Input format
          </label>
          <textarea
            id="inputFormat"
            name="inputFormat"
            placeholder="Describe the input format"
            value={problemForm.inputFormat}
            onChange={handleChange}
            rows="4"
          />

          <label className="form-field" htmlFor="outputFormat">
            Output format
          </label>
          <textarea
            id="outputFormat"
            name="outputFormat"
            placeholder="Describe the output format"
            value={problemForm.outputFormat}
            onChange={handleChange}
            rows="4"
          />

          <label className="form-field" htmlFor="constraintsText">
            Constraints
          </label>
          <textarea
            id="constraintsText"
            name="constraintsText"
            placeholder="1 <= n <= 10^5"
            value={problemForm.constraintsText}
            onChange={handleChange}
            rows="4"
          />

          <label className="form-field" htmlFor="examplesText">
            Examples
          </label>
          <textarea
            id="examplesText"
            name="examplesText"
            placeholder="Explain examples or walkthroughs"
            value={problemForm.examplesText}
            onChange={handleChange}
            rows="5"
          />

          <div className="detail-grid detail-grid-tight">
            <div>
              <label className="form-field" htmlFor="sampleInput">
                Sample input
              </label>
              <textarea
                id="sampleInput"
                name="sampleInput"
                rows="5"
                placeholder="1 2 3"
                value={problemForm.sampleInput}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="form-field" htmlFor="sampleOutput">
                Sample output
              </label>
              <textarea
                id="sampleOutput"
                name="sampleOutput"
                rows="5"
                placeholder="6"
                value={problemForm.sampleOutput}
                onChange={handleChange}
              />
            </div>
          </div>

          <button
            className="auth-button admin-button"
            type="submit"
            disabled={isSubmitting || !session?.token}
          >
            {isSubmitting ? "Saving..." : "Add coding question"}
          </button>
        </form>

        {status.message ? <p className="form-status success">{status.message}</p> : null}
        {status.error ? <p className="form-status error">{status.error}</p> : null}

        <div className="detail-actions">
          <Link className="auth-button admin-button detail-link" to="/admin/problems">
            View question list
          </Link>
          <Link className="auth-button ghost-button detail-link" to="/admin/dashboard">
            Back to dashboard
          </Link>
        </div>
      </PlatformSection>
    </PlatformLayout>
  );
}
