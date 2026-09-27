import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiBarChart2, FiCheckCircle, FiAlertTriangle, FiClock } from "react-icons/fi";
import { getExams, getMyResult } from "../../services/examService";
import PageHeader from "../../components/common/PageHeader";
import ErrorMessage from "../../components/common/ErrorMessage";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import { formatDateTime } from "../../utils/formatters";

/**
 * Student results page — real backend data.
 *
 * For every assigned exam, GET /api/exams/:id/my-result returns the
 * server-recorded submission: auto-graded MCQ score, teacher-assigned
 * coding marks (once reviewed), total and feedback.
 */
function StudentResults() {
  const [rows, setRows] = useState([]); // {exam, submitted, result}
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchResults = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getExams();
      const exams = data.exams || [];

      const results = await Promise.all(
        exams.map(async (exam) => {
          try {
            const res = await getMyResult(exam._id);
            return { exam, submitted: Boolean(res.submitted), result: res.result };
          } catch {
            // Endpoint unavailable for this exam — show as unknown, not fabricated
            return { exam, submitted: false, result: null };
          }
        })
      );
      setRows(results);
    } catch (err) {
      setError(err?.message || "Failed to load results.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, []);

  const submittedRows = rows.filter((r) => r.submitted && r.result);
  const pendingRows = rows.filter((r) => !r.submitted);

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Results"
        description="Scores from your submitted exam attempts, including teacher review feedback."
      />

      {loading && <LoadingSpinner label="Loading results..." />}
      {error && <ErrorMessage message={error} onRetry={fetchResults} />}

      {!loading && !error && (
        <>
          {submittedRows.length === 0 ? (
            <EmptyState
              icon={<FiBarChart2 />}
              title="No results yet"
              description="Results appear after you submit an exam. Scores are calculated on the server the moment you submit."
              actionLabel="View Available Exams"
              onAction={() => (window.location.href = "/candidate/exams")}
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-5 py-3">Examination</th>
                      <th className="px-5 py-3">Submitted</th>
                      <th className="px-5 py-3">MCQ</th>
                      <th className="px-5 py-3">Coding</th>
                      <th className="px-5 py-3">Total</th>
                      <th className="px-5 py-3">Grading</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {submittedRows.map(({ exam, result }) => {
                      const reviewed = result.status === "reviewed";
                      const codingDone = result.codingMarks !== null && result.codingMarks !== undefined;
                      const total = result.totalScore ?? result.autoScore;

                      return (
                        <tr key={exam._id} className="hover:bg-slate-50">
                          <td className="px-5 py-3">
                            <p className="font-medium text-slate-800">{exam.title}</p>
                            <p className="text-xs text-slate-500">
                              {formatDateTime(result.submittedAt)}
                            </p>
                          </td>
                          <td className="px-5 py-3">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-1 text-xs font-bold text-green-700">
                              <FiCheckCircle className="h-3.5 w-3.5" />
                              Yes
                            </span>
                          </td>
                          <td className="px-5 py-3 text-slate-700">
                            {result.totalMcqMarks > 0
                              ? `${result.autoScore}/${result.totalMcqMarks}`
                              : "—"}
                          </td>
                          <td className="px-5 py-3 text-slate-700">
                            {result.codingTotal > 0
                              ? codingDone
                                ? `${result.codingMarks}/${result.codingTotal}`
                                : "pending review"
                              : "—"}
                          </td>
                          <td className="px-5 py-3">
                            <span className="text-base font-bold text-slate-800">
                              {total}
                            </span>
                            {!reviewed && result.codingTotal > 0 && (
                              <span className="ml-1 text-[11px] text-amber-600">
                                (so far)
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                                reviewed
                                  ? "bg-green-100 text-green-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {reviewed ? "reviewed" : "awaiting review"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Teacher feedback */}
          {submittedRows.some((r) => r.result.feedback) && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-800">
                Teacher feedback
              </h3>
              <div className="mt-3 space-y-3">
                {submittedRows
                  .filter((r) => r.result.feedback)
                  .map(({ exam, result }) => (
                    <div key={exam._id} className="rounded-lg bg-slate-50 p-4">
                      <p className="text-xs font-semibold text-slate-500">
                        {exam.title}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-slate-700">
                        {result.feedback}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Not-yet-submitted exams */}
          {pendingRows.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <FiClock className="h-4 w-4 text-slate-400" />
                Not yet submitted ({pendingRows.length})
              </h3>
              <ul className="mt-3 space-y-2">
                {pendingRows.map(({ exam }) => (
                  <li
                    key={exam._id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-4 py-2.5"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-700">
                        {exam.title}
                      </p>
                      <p className="text-xs text-slate-500">
                        ends {formatDateTime(exam.endTime)}
                      </p>
                    </div>
                    <Link
                      to={`/candidate/exams/${exam._id}`}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                    >
                      Go to exam →
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="mt-2 flex items-start gap-1.5 text-xs text-amber-700">
              <FiAlertTriangle className="mt-0.5 h-3.5 w-3.5" />
              If a session generated proctoring alerts, an invigilator may
              review it before results are published. Scores come directly from
              the server — nothing on this page is computed locally.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

export default StudentResults;
