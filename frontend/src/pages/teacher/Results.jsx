import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { FiBarChart2, FiDownload, FiEdit3, FiCheckCircle } from "react-icons/fi";
import { toast } from "sonner";
import {
  getExams,
  getExamSubmissions,
  getExamQuestions,
  reviewSubmission,
} from "../../services/examService";
import {
  getProctoringEvents,
  getSuspicionScore,
} from "../../services/proctoringService";
import PageHeader from "../../components/common/PageHeader";
import ErrorMessage from "../../components/common/ErrorMessage";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import Modal from "../../components/common/Model";
import { EVENT_TYPE_LABELS, EVENT_TYPE_DESCRIPTIONS } from "../../services/proctoringService";

const PIE_COLORS = ["#22c55e", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6"];

/**
 * Results, analytics & submission review.
 *
 * Built from real backend data:
 *  - proctoring events + suspicion scores (integrity)
 *  - exam submissions with auto-graded MCQs (academic)
 *  - interview-style coding review (teacher awards marks + feedback)
 */
function Results() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);

  // Submissions for grading/review
  const [submissionGroups, setSubmissionGroups] = useState([]); // {examId, examTitle, codingTotal, questions, submissions}
  const [reviewTarget, setReviewTarget] = useState(null); // {group, submission}
  const [codingMarks, setCodingMarks] = useState("");
  const [feedback, setFeedback] = useState("");
  const [savingReview, setSavingReview] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getExams();
      const exams = data.exams || [];

      const all = [];
      const groups = [];
      for (const exam of exams) {
        const candidates = exam.candidates || [];

        // Academic submissions + question paper (owner-only endpoints;
        // failures are skipped silently — e.g. exams not owned by this teacher)
        const [subsRes, questionsRes] = await Promise.allSettled([
          getExamSubmissions(exam._id),
          getExamQuestions(exam._id),
        ]);
        if (subsRes.status === "fulfilled" && subsRes.value?.submissions) {
          groups.push({
            examId: exam._id,
            examTitle: exam.title,
            codingTotal: subsRes.value.codingTotal || 0,
            questions:
              questionsRes.status === "fulfilled"
                ? questionsRes.value?.questions || []
                : [],
            submissions: subsRes.value.submissions,
          });
        }

        const perCandidate = await Promise.all(
          candidates.map(async (c) => {
            const candidateId = c._id || c;
            const [eventsRes, scoreRes] = await Promise.allSettled([
              getProctoringEvents(candidateId, exam._id),
              getSuspicionScore(candidateId, exam._id),
            ]);
            const events =
              eventsRes.status === "fulfilled" ? eventsRes.value.events || [] : [];
            const score =
              scoreRes.status === "fulfilled"
                ? scoreRes.value.score?.score ?? 0
                : 0;
            return {
              examId: exam._id,
              examTitle: exam.title,
              examStatus: exam.status,
              candidateId,
              candidateName: c.name || "Unknown",
              events,
              score,
            };
          })
        );
        all.push(...perCandidate);
      }
      setRows(all);
      setSubmissionGroups(groups);
    } catch (err) {
      setError(err?.message || "Failed to load results.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // Flat lookup: "examId_candidateId" -> submission
  const submissionByKey = {};
  submissionGroups.forEach((group) => {
    group.submissions.forEach((sub) => {
      const candidateId = sub.candidate?._id || sub.candidate;
      submissionByKey[`${group.examId}_${candidateId}`] = { group, sub };
    });
  });

  // Aggregations
  const eventCounts = {};
  rows.forEach((r) =>
    r.events.forEach((e) => {
      eventCounts[e.eventType] = (eventCounts[e.eventType] || 0) + 1;
    })
  );
  const eventTypeData = Object.entries(eventCounts).map(([type, count]) => ({
    name: EVENT_TYPE_LABELS[type] || type,
    value: count,
  }));

  const riskData = [
    { name: "Clean (0)", value: rows.filter((r) => r.score === 0).length },
    { name: "Low (1-9)", value: rows.filter((r) => r.score >= 1 && r.score < 10).length },
    { name: "Medium (10-19)", value: rows.filter((r) => r.score >= 10 && r.score < 20).length },
    { name: "High (20+)", value: rows.filter((r) => r.score >= 20).length },
  ].filter((d) => d.value > 0);

  const scoreChart = rows
    .filter((r) => r.score > 0)
    .slice(0, 10)
    .map((r) => ({
      name: r.candidateName.split(" ")[0],
      score: r.score,
    }));

  // CSV export of real data
  const exportCSV = () => {
    if (rows.length === 0) {
      toast.error("No data to export.");
      return;
    }
    const header = [
      "Exam",
      "Candidate",
      "Email",
      "Suspicion Score",
      "Event Count",
      "Event Types",
      "Exam Status",
      "MCQ Score",
      "Coding Marks",
      "Total Score",
      "Grading Status",
    ];
    const lines = rows.map((r) => {
      const found = submissionByKey[`${r.examId}_${r.candidateId}`];
      const sub = found?.sub;
      return [
        r.examTitle,
        r.candidateName,
        r.candidateId,
        r.score,
        r.events.length,
        [...new Set(r.events.map((e) => e.eventType))].join(" | "),
        r.examStatus,
        sub ? `${sub.autoScore}/${sub.totalMcqMarks}` : "",
        sub?.codingMarks ?? "",
        sub ? sub.autoScore + (sub.codingMarks || 0) : "",
        sub?.status || "not submitted",
      ];
    });
    const csv = [header, ...lines]
      .map((line) => line.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `exam-proctoring-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Report exported as CSV.");
  };

  // ---- Interview-style submission review ----
  const openReview = (group, submission) => {
    setReviewTarget({ group, submission });
    setCodingMarks(
      submission.codingMarks === null || submission.codingMarks === undefined
        ? ""
        : String(submission.codingMarks)
    );
    setFeedback(submission.feedback || "");
  };

  const saveReview = async () => {
    if (!reviewTarget) return;
    const { group, submission } = reviewTarget;
    const marks = codingMarks === "" ? null : Number(codingMarks);
    if (marks !== null && (Number.isNaN(marks) || marks < 0)) {
      toast.error("Coding marks must be zero or more.");
      return;
    }
    if (marks !== null && group.codingTotal > 0 && marks > group.codingTotal) {
      toast.error(`Coding marks cannot exceed ${group.codingTotal}.`);
      return;
    }

    setSavingReview(true);
    try {
      await reviewSubmission(group.examId, submission._id, {
        codingMarks: marks,
        feedback,
      });
      toast.success("Review saved — candidate can now see the final score.");
      setReviewTarget(null);
      fetchAll();
    } catch (err) {
      toast.error(err?.message || "Failed to save review.");
    } finally {
      setSavingReview(false);
    }
  };

  const questionById = {};
  (reviewTarget?.group?.questions || []).forEach((q) => {
    questionById[q._id] = q;
  });

  if (loading) return <LoadingSpinner label="Loading results & analytics..." />;
  if (error) return <ErrorMessage message={error} onRetry={fetchAll} />;

  const totalEvents = rows.reduce((s, r) => s + r.events.length, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Results & Reports"
        description="Proctoring analytics derived from backend event logs and suspicion scores."
        actionLabel="Export CSV"
        onAction={exportCSV}
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={<FiBarChart2 />}
          title="No data yet"
          description="Once students attempt monitored exams, proctoring results will appear here."
        />
      ) : (
        <>
          {/* Summary */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-sm text-slate-500">Candidate sessions</p>
              <p className="mt-1 text-3xl font-bold text-slate-800">{rows.length}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-sm text-slate-500">Total proctoring events</p>
              <p className="mt-1 text-3xl font-bold text-slate-800">{totalEvents}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-sm text-slate-500">Flagged (score &gt; 0)</p>
              <p className="mt-1 text-3xl font-bold text-red-600">
                {rows.filter((r) => r.score > 0).length}
              </p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid gap-4 lg:grid-cols-2">
            {scoreChart.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="mb-4 text-sm font-semibold text-slate-800">
                  Suspicion score by candidate
                </h3>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={scoreChart}>
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis fontSize={12} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="score" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {eventTypeData.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="mb-4 text-sm font-semibold text-slate-800">
                  Event types distribution
                </h3>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={eventTypeData}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={90}
                      label
                    >
                      {eventTypeData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {riskData.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="mb-4 text-sm font-semibold text-slate-800">
                Risk distribution
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={riskData}>
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ============ Academic submissions & grading ============ */}
          {submissionGroups.some((g) => g.submissions.length > 0) && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-800">
                Exam submissions &amp; grading
              </h3>
              {submissionGroups
                .filter((g) => g.submissions.length > 0)
                .map((group) => (
                  <div
                    key={group.examId}
                    className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                  >
                    <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
                      <p className="text-sm font-semibold text-slate-800">
                        {group.examTitle}
                      </p>
                      <p className="text-xs text-slate-500">
                        {group.submissions.length} submission
                        {group.submissions.length !== 1 && "s"}
                        {group.codingTotal > 0 && ` · coding: ${group.codingTotal} marks`}
                      </p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[680px] text-left text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                            <th className="px-5 py-3">Candidate</th>
                            <th className="px-5 py-3">MCQ</th>
                            <th className="px-5 py-3">Coding</th>
                            <th className="px-5 py-3">Total</th>
                            <th className="px-5 py-3">Status</th>
                            <th className="px-5 py-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {group.submissions.map((sub) => {
                            const total =
                              sub.autoScore + (sub.codingMarks || 0);
                            return (
                              <tr key={sub._id} className="hover:bg-slate-50">
                                <td className="px-5 py-3">
                                  <p className="font-medium text-slate-800">
                                    {sub.candidate?.name || "Unknown"}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {sub.candidate?.email}
                                  </p>
                                </td>
                                <td className="px-5 py-3 text-slate-700">
                                  {sub.autoScore}/{sub.totalMcqMarks}
                                </td>
                                <td className="px-5 py-3 text-slate-700">
                                  {sub.codingMarks === null ||
                                  sub.codingMarks === undefined
                                    ? group.codingTotal > 0
                                      ? "pending"
                                      : "—"
                                    : `${sub.codingMarks}/${group.codingTotal}`}
                                </td>
                                <td className="px-5 py-3 font-semibold text-slate-800">
                                  {total}
                                </td>
                                <td className="px-5 py-3">
                                  <span
                                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                                      sub.status === "reviewed"
                                        ? "bg-green-100 text-green-700"
                                        : "bg-amber-100 text-amber-700"
                                    }`}
                                  >
                                    {sub.status}
                                  </span>
                                </td>
                                <td className="px-5 py-3 text-right">
                                  <button
                                    type="button"
                                    onClick={() => openReview(group, sub)}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                                  >
                                    <FiEdit3 className="h-3.5 w-3.5" />
                                    {sub.status === "reviewed"
                                      ? "Re-review"
                                      : "Review"}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* Detail table */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h3 className="text-sm font-semibold text-slate-800">
                Candidate-wise proctoring results
              </h3>
              <button
                type="button"
                onClick={exportCSV}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <FiDownload className="h-3.5 w-3.5" />
                CSV
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-3">Exam</th>
                    <th className="px-5 py-3">Candidate</th>
                    <th className="px-5 py-3">Suspicion Score</th>
                    <th className="px-5 py-3">Events</th>
                    <th className="px-5 py-3">Risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((r, i) => {
                    const risk =
                      r.score >= 20
                        ? ["High", "bg-red-100 text-red-700"]
                        : r.score >= 10
                          ? ["Medium", "bg-amber-100 text-amber-700"]
                          : r.score > 0
                            ? ["Low", "bg-yellow-100 text-yellow-700"]
                            : ["Clean", "bg-green-100 text-green-700"];
                    return (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-5 py-3 font-medium text-slate-800">
                          {r.examTitle}
                        </td>
                        <td className="px-5 py-3 text-slate-600">
                          {r.candidateName}
                        </td>
                        <td className="px-5 py-3 font-semibold text-slate-800">
                          {r.score}
                        </td>
                        <td className="px-5 py-3 text-slate-600">
                          {r.events.length}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${risk[1]}`}>
                            {risk[0]}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-xs leading-5 text-slate-500">
            <strong>Academic marks:</strong> MCQs are auto-graded server-side at
            submission time; coding answers are scored by you in the review
            panel above (interview-style). Rows show proctoring integrity
            results — events are indicators for human review, not proof of
            malpractice.
          </p>

          {/* Interview-style submission review modal */}
          <Modal
            open={Boolean(reviewTarget)}
            title={`Review — ${reviewTarget?.submission?.candidate?.name || ""}`}
            onClose={() => setReviewTarget(null)}
            size="max-w-3xl"
          >
            {reviewTarget && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                    {reviewTarget.group.examTitle}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    MCQ: {reviewTarget.submission.autoScore}/
                    {reviewTarget.submission.totalMcqMarks}
                  </span>
                  <span className="text-xs text-slate-500">
                    submitted{" "}
                    {new Date(
                      reviewTarget.submission.submittedAt
                    ).toLocaleString()}
                  </span>
                </div>

                {/* Answers */}
                <div className="space-y-3">
                  {(reviewTarget.submission.answers || []).length === 0 && (
                    <p className="text-sm text-slate-500">
                      No answers were recorded for this attempt.
                    </p>
                  )}
                  {(reviewTarget.submission.answers || []).map((answer, i) => {
                    const question = questionById[answer.question];
                    if (!question) return null;
                    const selected = question.options?.find(
                      (o) => o.id === answer.selectedOption
                    );
                    const isCorrect =
                      question.type === "mcq" &&
                      question.correctOption === answer.selectedOption;

                    return (
                      <div
                        key={i}
                        className="rounded-lg border border-slate-200 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-medium text-slate-800">
                            {i + 1}. {question.questionText}
                          </p>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              question.type === "coding"
                                ? "bg-purple-100 text-purple-700"
                                : isCorrect
                                  ? "bg-green-100 text-green-700"
                                  : answer.selectedOption
                                    ? "bg-red-100 text-red-700"
                                    : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {question.type === "coding"
                              ? `${question.marks} marks (review)`
                              : isCorrect
                                ? "correct"
                                : answer.selectedOption
                                  ? "incorrect"
                                  : "unanswered"}
                          </span>
                        </div>

                        {question.type === "coding" ? (
                          <div className="mt-3">
                            <p className="mb-1 text-xs font-semibold text-slate-500">
                              Language: {answer.language || question.language}
                            </p>
                            <pre className="max-h-64 overflow-auto rounded-lg bg-slate-900 p-3 font-mono text-xs leading-5 text-slate-100">
                              {answer.code?.trim()
                                ? answer.code
                                : "(no code submitted)"}
                            </pre>
                            {question.expectedApproach && (
                              <p className="mt-2 text-xs text-slate-500">
                                <strong>Expected approach:</strong>{" "}
                                {question.expectedApproach}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p
                            className={`mt-2 text-sm ${
                              isCorrect ? "text-green-700" : "text-slate-600"
                            }`}
                          >
                            Answer:{" "}
                            {selected
                              ? `${selected.id.toUpperCase()}. ${selected.text}`
                              : "not answered"}
                            {!isCorrect && question.correctOption && (
                              <span className="ml-2 font-semibold text-green-700">
                                Correct:{" "}
                                {
                                  question.options?.find(
                                    (o) => o.id === question.correctOption
                                  )?.text
                                }
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Review inputs */}
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
                    <div>
                      <label
                        htmlFor="coding-marks"
                        className="mb-1.5 block text-sm font-medium text-amber-900"
                      >
                        Coding marks
                        {reviewTarget.group.codingTotal > 0 &&
                          ` (0–${reviewTarget.group.codingTotal})`}
                      </label>
                      <input
                        id="coding-marks"
                        type="number"
                        min="0"
                        max={reviewTarget.group.codingTotal || undefined}
                        value={codingMarks}
                        onChange={(e) => setCodingMarks(e.target.value)}
                        placeholder="—"
                        className="w-full rounded-lg border border-amber-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="review-feedback"
                        className="mb-1.5 block text-sm font-medium text-amber-900"
                      >
                        Feedback for candidate
                      </label>
                      <textarea
                        id="review-feedback"
                        rows={3}
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        placeholder="e.g. Correct approach, clean variable names — minor edge-case miss on empty input."
                        className="w-full rounded-lg border border-amber-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setReviewTarget(null)}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={saveReview}
                      disabled={savingReview}
                      className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
                    >
                      <FiCheckCircle className="h-4 w-4" />
                      {savingReview ? "Saving..." : "Save review"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </Modal>
        </>
      )}
    </div>
  );
}

export default Results;
