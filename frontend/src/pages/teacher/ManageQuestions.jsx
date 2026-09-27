import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  FiArrowLeft,
  FiPlus,
  FiTrash2,
  FiCheckCircle,
  FiCode,
} from "react-icons/fi";
import { toast } from "sonner";
import { getExamById, getExamQuestions, addQuestion, deleteQuestion } from "../../services/examService";
import PageHeader from "../../components/common/PageHeader";
import ErrorMessage from "../../components/common/ErrorMessage";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import ConfirmDialog from "../../components/common/ConfirmDialog";

const newMcq = () => ({
  type: "mcq",
  questionText: "",
  options: [
    { id: "a", text: "" },
    { id: "b", text: "" },
  ],
  correctOption: "a",
  marks: 1,
});

const newCoding = () => ({
  type: "coding",
  questionText: "",
  language: "javascript",
  starterCode: "",
  expectedApproach: "",
  marks: 10,
});

/**
 * Question bank for one exam (invigilator).
 * Real endpoints: GET/POST/DELETE /api/exams/:examId/questions
 */
function ManageQuestions() {
  const { examId } = useParams();

  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [form, setForm] = useState(newMcq());
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchAll = useCallback(async () => {
    setError("");
    try {
      const [examData, questionData] = await Promise.all([
        getExamById(examId),
        getExamQuestions(examId),
      ]);
      setExam(examData.exam || examData);
      setQuestions(questionData.questions || []);
    } catch (err) {
      setError(err?.message || "Failed to load question bank.");
    } finally {
      setLoading(false);
    }
  }, [examId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const updateOption = (index, value) => {
    setForm((f) => ({
      ...f,
      options: f.options.map((o, i) => (i === index ? { ...o, text: value } : o)),
    }));
  };

  const addOption = () => {
    setForm((f) => {
      if (f.options.length >= 6) return f;
      const id = String.fromCharCode(97 + f.options.length);
      return { ...f, options: [...f.options, { id, text: "" }] };
    });
  };

  const removeOption = (index) => {
    setForm((f) => {
      if (f.options.length <= 2) return f;
      const options = f.options.filter((_, i) => i !== index);
      const correctStillExists = options.some((o) => o.id === f.correctOption);
      return { ...f, options, correctOption: correctStillExists ? f.correctOption : options[0].id };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.questionText.trim()) {
      toast.error("Question text is required.");
      return;
    }
    if (form.type === "mcq") {
      if (form.options.some((o) => !o.text.trim())) {
        toast.error("All options need text — remove empty ones.");
        return;
      }
      if (!form.correctOption) {
        toast.error("Select the correct option.");
        return;
      }
    }

    setSaving(true);
    try {
      const payload =
        form.type === "mcq"
          ? {
              type: "mcq",
              questionText: form.questionText.trim(),
              options: form.options,
              correctOption: form.correctOption,
              marks: Number(form.marks) || 1,
              order: questions.length,
            }
          : {
              type: "coding",
              questionText: form.questionText.trim(),
              language: form.language,
              starterCode: form.starterCode,
              expectedApproach: form.expectedApproach.trim(),
              marks: Number(form.marks) || 10,
              order: questions.length,
            };

      await addQuestion(examId, payload);
      toast.success("Question added.");
      setForm(form.type === "mcq" ? newMcq() : newCoding());
      fetchAll();
    } catch (err) {
      toast.error(err?.message || "Failed to add question.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await deleteQuestion(examId, deleteTarget._id);
      toast.success("Question deleted.");
      fetchAll();
    } catch (err) {
      toast.error(err?.message || "Failed to delete question.");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  if (loading) return <LoadingSpinner label="Loading question bank..." />;
  if (error)
    return (
      <div className="p-6">
        <ErrorMessage message={error} onRetry={fetchAll} />
      </div>
    );

  const mcqCount = questions.filter((q) => q.type === "mcq").length;
  const codingCount = questions.filter((q) => q.type === "coding").length;
  const totalMarks = questions.reduce((s, q) => s + (q.marks || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/invigilator/exams"
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-800"
        >
          <FiArrowLeft className="h-4 w-4" />
          My Exams
        </Link>
        <PageHeader
          title={`Question Bank — ${exam?.title || ""}`}
          description="Build the paper with multiple-choice and coding questions (interview-style)."
        />
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Total questions</p>
          <p className="mt-1 text-2xl font-bold text-slate-800">{questions.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">MCQ</p>
          <p className="mt-1 text-2xl font-bold text-blue-600">{mcqCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Coding</p>
          <p className="mt-1 text-2xl font-bold text-purple-600">{codingCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Total marks</p>
          <p className="mt-1 text-2xl font-bold text-slate-800">{totalMarks}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ============ Add question form ============ */}
        <section className="h-fit rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-800">Add Question</h2>

          {/* Type switch */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setForm(newMcq())}
              className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition ${
                form.type === "mcq"
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <FiCheckCircle className="h-4 w-4" />
              Multiple Choice
            </button>
            <button
              type="button"
              onClick={() => setForm(newCoding())}
              className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition ${
                form.type === "coding"
                  ? "border-purple-600 bg-purple-50 text-purple-700"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <FiCode className="h-4 w-4" />
              Coding
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Question text *
              </label>
              <textarea
                value={form.questionText}
                onChange={(e) => setForm((f) => ({ ...f, questionText: e.target.value }))}
                rows={3}
                placeholder={
                  form.type === "mcq"
                    ? "e.g. Which method returns the largest value in an array?"
                    : "e.g. Write a function that returns the nth Fibonacci number. Explain your approach."
                }
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {form.type === "mcq" ? (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Options — pick the correct one
                </label>
                <div className="space-y-2">
                  {form.options.map((opt, index) => (
                    <div key={opt.id} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="correctOption"
                        checked={form.correctOption === opt.id}
                        onChange={() => setForm((f) => ({ ...f, correctOption: opt.id }))}
                        aria-label={`Mark option ${opt.id.toUpperCase()} correct`}
                        className="h-4 w-4 shrink-0 accent-green-600"
                      />
                      <span className="w-6 shrink-0 text-xs font-bold uppercase text-slate-500">
                        {opt.id}
                      </span>
                      <input
                        type="text"
                        value={opt.text}
                        onChange={(e) => updateOption(index, e.target.value)}
                        placeholder={`Option ${opt.id.toUpperCase()}`}
                        className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                      {form.options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeOption(index)}
                          aria-label={`Remove option ${opt.id.toUpperCase()}`}
                          className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <FiTrash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {form.options.length < 6 && (
                  <button
                    type="button"
                    onClick={addOption}
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    <FiPlus className="h-3.5 w-3.5" />
                    Add option
                  </button>
                )}
                <p className="mt-2 text-[11px] text-slate-400">
                  Green radio = correct answer (kept server-side, never sent to
                  students before submission).
                </p>
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Default language
                    </label>
                    <select
                      value={form.language}
                      onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="javascript">JavaScript</option>
                      <option value="python">Python</option>
                      <option value="java">Java</option>
                      <option value="cpp">C++</option>
                      <option value="c">C</option>
                      <option value="sql">SQL</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Marks (teacher-reviewed)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={form.marks}
                      onChange={(e) => setForm((f) => ({ ...f, marks: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Starter code (optional)
                  </label>
                  <textarea
                    value={form.starterCode}
                    onChange={(e) => setForm((f) => ({ ...f, starterCode: e.target.value }))}
                    rows={4}
                    spellCheck={false}
                    placeholder={"function solve(input) {\n  // your code here\n}"}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 font-mono text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-blue-400"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Expected approach (review guidance)
                  </label>
                  <input
                    type="text"
                    value={form.expectedApproach}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, expectedApproach: e.target.value }))
                    }
                    placeholder="e.g. O(n) two-pointer solution with clear variable names"
                    className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <p className="text-[11px] text-slate-400">
                  Coding answers are graded by you when you review the submission —
                  no external code-runner or API is used.
                </p>
              </>
            )}

            {form.type === "mcq" && (
              <div className="w-32">
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Marks</label>
                <input
                  type="number"
                  min="1"
                  value={form.marks}
                  onChange={(e) => setForm((f) => ({ ...f, marks: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              <FiPlus className="h-4 w-4" />
              {saving ? "Adding..." : "Add to question bank"}
            </button>
          </form>
        </section>

        {/* ============ Question list ============ */}
        <section className="space-y-4">
          <h2 className="text-base font-semibold text-slate-800">
            Paper ({questions.length})
          </h2>

          {questions.length === 0 ? (
            <EmptyState
              title="No questions yet"
              description="Add MCQ or coding questions from the form. Students see the paper the moment you add it."
            />
          ) : (
            questions.map((q, index) => (
              <article
                key={q._id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-slate-400">Q{index + 1}</span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          q.type === "coding"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {q.type === "coding" ? `Coding · ${q.language}` : "MCQ"}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                        {q.marks} marks
                      </span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                      {q.questionText}
                    </p>

                    {q.type === "mcq" && (
                      <ul className="mt-2 space-y-1">
                        {(q.options || []).map((opt) => (
                          <li
                            key={opt.id}
                            className={`text-xs ${
                              opt.id === q.correctOption
                                ? "font-semibold text-green-700"
                                : "text-slate-500"
                            }`}
                          >
                            {opt.id.toUpperCase()}. {opt.text}
                            {opt.id === q.correctOption && " ✓"}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setDeleteTarget(q)}
                    aria-label={`Delete question ${index + 1}`}
                    className="shrink-0 rounded-lg border border-red-200 p-2 text-red-500 hover:bg-red-50"
                  >
                    <FiTrash2 className="h-4 w-4" />
                  </button>
                </div>
              </article>
            ))
          )}
        </section>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete question?"
        message="This question will be removed from the paper. Existing submissions keep their recorded answers."
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

export default ManageQuestions;
