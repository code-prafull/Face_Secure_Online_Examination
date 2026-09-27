import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  FiArrowLeft,
  FiUsers,
  FiAlertTriangle,
  FiRefreshCw,
  FiFileText,
  FiClock,
  FiUserPlus,
} from "react-icons/fi";
import { toast } from "sonner";
import { getExamById, updateExam } from "../../services/examService";
import { getStudents } from "../../services/studentService";
import {
  getProctoringEvents,
  getSuspicionScore,
  getViolations,
  EVENT_TYPE_LABELS,
} from "../../services/proctoringService";
import { buildSessionSummary } from "../../utils/sessionSummary";
import PageHeader from "../../components/common/PageHeader";
import ErrorMessage from "../../components/common/ErrorMessage";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import StatusBadge from "../../components/common/StatusBadge";
import Modal from "../../components/common/Model";
import {
  formatDateTime,
  getEventTypeColor,
} from "../../utils/formatters";

const RISK_LEVELS = [
  { min: 20, label: "High Risk", cls: "bg-red-100 text-red-700" },
  { min: 10, label: "Medium Risk", cls: "bg-amber-100 text-amber-700" },
  { min: 1, label: "Low Risk", cls: "bg-yellow-100 text-yellow-700" },
  { min: 0, label: "No Alerts", cls: "bg-green-100 text-green-700" },
];

const riskFor = (score) => RISK_LEVELS.find((r) => score >= r.min);

const REFRESH_MS = 5000; // real-time feel for live invigilation

/**
 * Per-exam live monitor.
 * Merges camera/object events (POST /api/events) with behavioural
 * violations (POST /api/violations) into a single timeline and refreshes
 * every 5s. Session summaries are generated LOCALLY with a rule-based
 * algorithm (no Google/Gemini API key involved).
 */
function ExamMonitor() {
  const { examId } = useParams();
  const [exam, setExam] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastRefresh, setLastRefresh] = useState(null);

  // Local rule-based summary modal
  const [summaryRow, setSummaryRow] = useState(null);

  // Candidate assignment modal — PUT /api/exams/:id { candidates }
  const [assignOpen, setAssignOpen] = useState(false);
  const [allStudents, setAllStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [selected, setSelected] = useState([]);
  const [staleAssigned, setStaleAssigned] = useState([]);
  const [savingAssign, setSavingAssign] = useState(false);

  const openAssign = async () => {
    setAssignOpen(true);
    setSelected([]);
    setStaleAssigned([]);
    setStudentsLoading(true);
    try {
      const data = await getStudents();
      const list = data.students || [];
      setAllStudents(list);
      // Only send ids that are still candidate accounts — anything else in
      // the exam record (stale/orphan references) is shown separately and
      // dropped on save instead of triggering a backend 400.
      const known = new Set(list.map((s) => s.id));
      const current = (exam?.candidates || []).map((c) => c._id || c);
      setSelected(current.filter((id) => known.has(id)));
      setStaleAssigned(current.filter((id) => !known.has(id)));
    } catch (err) {
      toast.error(err?.message || "Failed to load students.");
      setAllStudents([]);
    } finally {
      setStudentsLoading(false);
    }
  };

  const toggleStudent = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const saveAssign = async () => {
    setSavingAssign(true);
    try {
      await updateExam(examId, { candidates: selected });
      toast.success(
        selected.length
          ? `Assigned ${selected.length} student${selected.length > 1 ? "s" : ""}.`
          : "All students unassigned from this exam."
      );
      setAssignOpen(false);
      fetchAll();
    } catch (err) {
      toast.error(err?.message || "Failed to update assignment.");
    } finally {
      setSavingAssign(false);
    }
  };

  const fetchAll = useCallback(async () => {
    setError("");
    try {
      const examData = await getExamById(examId);
      const examObj = examData.exam || examData;
      setExam(examObj);

      const candidates = examObj.candidates || [];
      const data = await Promise.all(
        candidates.map(async (c) => {
          const candidateId = c._id || c;
          const [eventsRes, scoreRes, violationsRes] = await Promise.allSettled([
            getProctoringEvents(candidateId, examId),
            getSuspicionScore(candidateId, examId),
            getViolations(candidateId, examId),
          ]);

          const cameraEvents =
            eventsRes.status === "fulfilled" ? eventsRes.value.events || [] : [];
          const violations =
            violationsRes.status === "fulfilled"
              ? violationsRes.value.violations || []
              : [];
          const score =
            scoreRes.status === "fulfilled" ? scoreRes.value.score?.score ?? 0 : 0;

          // Unified timeline: camera detections + browser violations
          const merged = [
            ...cameraEvents.map((e) => ({
              id: e._id,
              type: e.eventType,
              timestamp: e.timestamp || e.createdAt,
              details: e.details || "",
              source: "camera",
            })),
            ...violations.map((v) => ({
              id: v._id,
              type: v.type,
              timestamp: v.timestamp || v.createdAt,
              details: v.details || "",
              // UNKNOWN_FACE is detected in the camera feed (identity
              // match), even though it is posted via /api/violations.
              source: v.type === "UNKNOWN_FACE" ? "camera" : "screen",
            })),
          ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

          return {
            candidateId,
            name: c.name || "Unknown",
            email: c.email || "",
            incidents: merged,
            score,
          };
        })
      );

      setRows(data);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err?.message || "Failed to load monitoring data.");
    } finally {
      setLoading(false);
    }
  }, [examId]);

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, REFRESH_MS);
    return () => clearInterval(id);
  }, [fetchAll]);

  const totalIncidents = rows.reduce((sum, r) => sum + r.incidents.length, 0);
  const flagged = rows.filter((r) => r.score > 0).length;

  if (loading) return <LoadingSpinner label="Loading live monitor..." />;

  const summaryData = summaryRow
    ? buildSessionSummary(summaryRow.incidents, summaryRow.score)
    : null;

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/invigilator/monitoring"
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-800"
        >
          <FiArrowLeft className="h-4 w-4" />
          All exams
        </Link>
        <PageHeader
          title={exam?.title || "Exam Monitor"}
          description={`Live proctoring — auto-refresh every ${
            REFRESH_MS / 1000
          }s${lastRefresh ? ` • last ${lastRefresh.toLocaleTimeString()}` : ""}`}
        />
      </div>

      {error && <ErrorMessage message={error} onRetry={fetchAll} />}

      {/* Exam summary bar */}
      {exam && (
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium text-slate-500">Status</p>
            <div className="mt-1.5">
              <StatusBadge status={exam.status} />
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium text-slate-500">Candidates</p>
            <p className="mt-1 text-2xl font-bold text-slate-800">{rows.length}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium text-slate-500">Total Alerts</p>
            <p className="mt-1 text-2xl font-bold text-slate-800">
              {totalIncidents}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium text-slate-500">Flagged Students</p>
            <p className="mt-1 text-2xl font-bold text-red-600">{flagged}</p>
          </div>
        </div>
      )}

      {/* Refresh button + live pulse */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={fetchAll}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <FiRefreshCw className="h-4 w-4" />
          Refresh now
        </button>
        <button
          type="button"
          onClick={openAssign}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <FiUserPlus className="h-4 w-4" />
          Assign students
        </button>
        <span className="inline-flex items-center gap-2 text-xs font-semibold text-green-700">
          <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
          LIVE — refreshing every {REFRESH_MS / 1000}s
        </span>
      </div>

      {/* Per-candidate cards */}
      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <FiUsers className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-600">
            No candidates assigned to this exam.
          </p>
          <button
            type="button"
            onClick={openAssign}
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <FiUserPlus className="h-4 w-4" />
            Assign students now
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => {
            const risk = riskFor(row.score);
            const recentIncidents = row.incidents.slice(0, 8);

            return (
              <article
                key={row.candidateId}
                className="rounded-xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                      {row.name?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {row.name}
                      </p>
                      <p className="text-xs text-slate-500">{row.email}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${risk.cls}`}>
                      Suspicion {row.score} — {risk.label}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      {row.incidents.length} alerts
                    </span>
                  </div>
                </div>

                <div className="px-5 py-4">
                  {row.incidents.length === 0 ? (
                    <p className="flex items-center gap-2 text-sm text-green-600">
                      <FiAlertTriangle className="h-4 w-4" />
                      No violations recorded for this session.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {recentIncidents.map((incident) => (
                        <div
                          key={incident.id}
                          className="flex flex-wrap items-center gap-3 rounded-lg bg-slate-50 px-3 py-2"
                        >
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${getEventTypeColor(
                              incident.type
                            )}`}
                          >
                            {incident.type}
                          </span>
                          <span className="text-xs text-slate-600">
                            {EVENT_TYPE_LABELS[incident.type] || incident.type}
                          </span>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                              incident.source === "camera"
                                ? "bg-blue-50 text-blue-600"
                                : "bg-purple-50 text-purple-600"
                            }`}
                          >
                            {incident.source === "camera" ? "camera" : "screen"}
                          </span>
                          {incident.details && (
                            <span className="text-xs text-slate-400">
                              — {incident.details}
                            </span>
                          )}
                          <span className="ml-auto flex items-center gap-1 text-[11px] text-slate-400">
                            <FiClock className="h-3 w-3" />
                            {formatDateTime(incident.timestamp)}
                          </span>
                        </div>
                      ))}
                      {row.incidents.length > 8 && (
                        <p className="text-center text-xs text-slate-400">
                          +{row.incidents.length - 8} earlier alerts
                        </p>
                      )}
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                    <button
                      type="button"
                      onClick={() => setSummaryRow(row)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-900"
                    >
                      <FiFileText className="h-3.5 w-3.5" />
                      Session Summary
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <p className="text-xs leading-5 text-slate-500">
        <strong>Note:</strong> detection events are generated in each student's
        browser (face + object detection) and logged through{" "}
        <code>POST /api/events</code>; screen-guard violations (tab switch,
        copy/paste, fullscreen) through <code>POST /api/violations</code>.
        Suspicion scores are computed by the backend. Summaries are generated
        locally with a deterministic rule-based algorithm — no external AI API
        is involved. Events are indicators for human review — they do not by
        themselves prove malpractice.
      </p>

      {/* Local rule-based session summary */}
      <Modal
        open={Boolean(summaryRow)}
        title={`Session Summary — ${summaryRow?.name || ""}`}
        onClose={() => setSummaryRow(null)}
        size="max-w-2xl"
      >
        {summaryData && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  summaryData.risk.color === "red"
                    ? "bg-red-100 text-red-700"
                    : summaryData.risk.color === "amber"
                      ? "bg-amber-100 text-amber-700"
                      : summaryData.risk.color === "yellow"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-green-100 text-green-700"
                }`}
              >
                {summaryData.headline}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
                generated locally · {new Date().toLocaleTimeString()}
              </span>
            </div>

            {/* Headline counts */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Object.entries(summaryData.counts).slice(0, 4).map(([type, count]) => (
                <div key={type} className="rounded-lg border border-slate-200 p-3">
                  <p className="text-[10px] font-bold uppercase text-slate-400">
                    {type}
                  </p>
                  <p className="mt-0.5 text-xl font-bold text-slate-800">{count}</p>
                </div>
              ))}
            </div>

            {/* Narrative */}
            <div className="space-y-3">
              {summaryData.paragraphs.map((paragraph, i) => (
                <p key={i} className="text-sm leading-6 text-slate-700">
                  {paragraph}
                </p>
              ))}
            </div>

            {/* Timeline */}
            {summaryData.timeline.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                  Timeline
                </h3>
                <ul className="max-h-48 space-y-1.5 overflow-y-auto rounded-lg bg-slate-50 p-3">
                  {summaryData.timeline.map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-xs">
                      <span className="w-12 shrink-0 font-mono text-slate-500">
                        {item.time}
                      </span>
                      <span className="font-semibold text-slate-700">
                        {item.label}
                      </span>
                      {item.details && (
                        <span className="truncate text-slate-400">
                          {item.details}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <h3 className="text-xs font-bold uppercase tracking-wide text-blue-700">
                Recommended next steps
              </h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5 text-blue-900">
                {summaryData.recommendations.map((rec, i) => (
                  <li key={i}>{rec}</li>
                ))}
              </ul>
            </div>

            <p className="text-[11px] leading-4 text-slate-400">
              Deterministic rule-based digest computed in your browser from the
              events shown above — no external AI service or API key used.
              Always corroborate with human review before acting.
            </p>
          </div>
        )}
      </Modal>
      {/* Candidate assignment — PUT /api/exams/:id { candidates } */}
      <Modal
        open={assignOpen}
        title={`Assign students — ${exam?.title || ""}`}
        onClose={() => !savingAssign && setAssignOpen(false)}
        size="max-w-2xl"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Select who may take this exam. Saving replaces the full assignment
            list (<code>PUT /api/exams/:id</code>).
          </p>

          {studentsLoading ? (
            <LoadingSpinner label="Loading students..." />
          ) : allStudents.length === 0 ? (
            <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              No candidate accounts registered yet. Students appear here once
              they register.
            </p>
          ) : (
            <>
              {staleAssigned.length > 0 && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                  {staleAssigned.length} assigned account
                  {staleAssigned.length > 1 ? "s are" : " is"} no longer a
                  candidate account and will be removed from this exam when you
                  save.
                </p>
              )}
              <div className="max-h-72 space-y-1.5 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3">
              {allStudents.map((s) => (
                <label
                  key={s.id}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-100"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(s.id)}
                    onChange={() => toggleStudent(s.id)}
                    className="h-4 w-4 accent-blue-600"
                  />
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                    {s.name?.[0]?.toUpperCase() || "?"}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-slate-800">
                      {s.name}
                    </span>
                    <span className="block truncate text-xs text-slate-500">
                      {s.email}
                    </span>
                  </span>
                </label>
              ))}
              </div>
            </>
          )}

          <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-4">
            <span className="text-xs font-semibold text-slate-500">
              {selected.length} of {allStudents.length} selected
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAssignOpen(false)}
                disabled={savingAssign}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveAssign}
                disabled={savingAssign || studentsLoading}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                <FiUserPlus className="h-4 w-4" />
                {savingAssign ? "Saving..." : "Save assignment"}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default ExamMonitor;
