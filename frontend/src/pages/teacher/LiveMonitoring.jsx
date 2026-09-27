import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiActivity, FiUsers, FiAlertTriangle, FiSearch } from "react-icons/fi";
import { getExams } from "../../services/examService";
import PageHeader from "../../components/common/PageHeader";
import StatusBadge from "../../components/common/StatusBadge";
import ErrorMessage from "../../components/common/ErrorMessage";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import { formatDateTime } from "../../utils/formatters";

/**
 * Live Monitoring overview — active exams with candidate counts.
 * Full per-candidate detail lives at /invigilator/monitoring/:examId.
 */
function LiveMonitoring() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const fetchExams = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getExams();
      setExams(data.exams || []);
    } catch (err) {
      setError(err?.message || "Failed to load exams.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
    const id = setInterval(fetchExams, 30000);
    return () => clearInterval(id);
  }, []);

  const filtered = exams.filter((e) =>
    e.title?.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = exams.filter((e) => e.status === "active").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Live Monitoring"
        description="Track active examinations and review proctoring alerts: extra faces, missing faces and mobile-phone detections."
      />

      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-2 rounded-full bg-red-100 px-4 py-2 text-sm font-semibold text-red-700">
          <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
          {activeCount} active exam{activeCount !== 1 && "s"}
        </span>

        <div className="relative max-w-xs flex-1">
          <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search exams..."
            className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>

      {loading && <LoadingSpinner label="Loading monitoring data..." />}
      {error && <ErrorMessage message={error} onRetry={fetchExams} />}

      {!loading && !error && filtered.length === 0 && (
        <EmptyState
          icon={<FiActivity />}
          title="No exams to monitor"
          description="Exams assigned to you will appear here when they are scheduled or active."
        />
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((exam) => {
            const isActive = exam.status === "active";
            return (
              <article
                key={exam._id}
                className={`rounded-xl border bg-white p-5 shadow-sm transition hover:shadow-md ${
                  isActive ? "border-red-200" : "border-slate-200"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-800">
                      {exam.title || "Untitled Exam"}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Starts {formatDateTime(exam.startTime)}
                    </p>
                  </div>
                  <StatusBadge status={exam.status} />
                </div>

                <div className="mt-4 flex items-center gap-4 text-sm text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <FiUsers className="h-4 w-4 text-slate-400" />
                    {exam.candidates?.length || 0} candidates
                  </span>
                  <span className="flex items-center gap-1.5">
                    <FiAlertTriangle className="h-4 w-4 text-slate-400" />
                    alerts viewable
                  </span>
                </div>

                <Link
                  to={`/invigilator/monitoring/${exam._id}`}
                  className={`mt-5 block w-full rounded-lg px-4 py-2.5 text-center text-sm font-semibold text-white transition ${
                    isActive
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {isActive ? "Open Live Monitor" : "View Monitoring"}
                </Link>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default LiveMonitoring;
