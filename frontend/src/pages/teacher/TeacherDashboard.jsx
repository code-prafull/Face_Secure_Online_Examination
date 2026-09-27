import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiBook,
  FiUsers,
  FiClock,
  FiCheckCircle,
  FiActivity,
  FiAlertTriangle,
  FiPlusCircle,
} from "react-icons/fi";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { getExams } from "../../services/examService";
import { getAnalytics } from "../../services/resultService";
import StatCard from "../../components/common/StateCard";
import StatusBadge from "../../components/common/StatusBadge";
import ErrorMessage from "../../components/common/ErrorMessage";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { formatDateTime } from "../../utils/formatters";

function TeacherDashboard() {
  const { user } = useAuth();
  const [exams, setExams] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchExams = async () => {
    setLoading(true);
    setError("");
    try {
      const [examsRes, analyticsRes] = await Promise.allSettled([
        getExams(),
        getAnalytics(),
      ]);
      if (examsRes.status === "fulfilled") {
        setExams(examsRes.value.exams || []);
      } else {
        throw examsRes.reason;
      }
      if (analyticsRes.status === "fulfilled") {
        setAnalytics(analyticsRes.value);
      }
    } catch (err) {
      setError(err?.message || "Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const now = new Date();
  const stats = {
    total: exams.length,
    active: exams.filter((e) => e.status === "active").length,
    upcoming: exams.filter(
      (e) => e.status === "upcoming" || (e.startTime && new Date(e.startTime) > now)
    ).length,
    completed: exams.filter((e) => e.status === "completed").length,
    students: new Set(
      exams.flatMap((e) => (e.candidates || []).map((c) => c._id || c))
    ).size,
  };

  const recent = [...exams]
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-blue-200 bg-blue-600 p-6 text-white">
        <div>
          <h1 className="text-xl font-bold">
            Welcome, {user?.name || "Teacher"}
          </h1>
          <p className="mt-1 text-sm text-blue-100">
            Monitor examinations, review proctoring alerts and manage students.
          </p>
        </div>
        <Link
          to="/invigilator/create-exam"
          className="flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-50"
        >
          <FiPlusCircle className="h-4 w-4" />
          Create Exam
        </Link>
      </div>

      {loading && <LoadingSpinner label="Loading dashboard..." />}
      {error && <ErrorMessage message={error} onRetry={fetchExams} />}

      {!loading && !error && (
        <>
          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Exams"
              value={stats.total}
              icon={<FiBook />}
              accent="blue"
            />
            <StatCard
              title="Registered Students"
              value={
                analytics?.totals?.students ?? stats.students
              }
              icon={<FiUsers />}
              accent="purple"
              description={
                analytics?.totals?.students != null
                  ? "Candidate accounts in the system"
                  : "Unique candidates assigned to exams"
              }
            />
            <StatCard
              title="Upcoming Exams"
              value={stats.upcoming}
              icon={<FiClock />}
              accent="amber"
            />
            <StatCard
              title="Active Exams"
              value={stats.active}
              icon={<FiActivity />}
              accent="green"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard
              title="Completed Exams"
              value={stats.completed}
              icon={<FiCheckCircle />}
              accent="green"
            />
            <StatCard
              title="Proctoring Alerts"
              value={
                analytics?.totals
                  ? (analytics.totals.violations || 0) +
                    (analytics.totals.events || 0)
                  : "Live"
              }
              icon={<FiAlertTriangle />}
              accent="red"
              description={
                analytics?.totals
                  ? `${analytics.totals.violations || 0} violations · ${
                      analytics.totals.events || 0
                    } camera events`
                  : "View per-exam events in Live Monitoring"
              }
            />
          </div>

          {/* Recent exams */}
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2 className="text-base font-semibold text-slate-800">
                Recent Examination Activity
              </h2>
              <Link
                to="/invigilator/exams"
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                View all
              </Link>
            </div>

            {recent.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-sm text-slate-500">No exams created yet.</p>
                <Link
                  to="/invigilator/create-exam"
                  className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Create your first exam
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-5 py-3">Exam</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Start</th>
                      <th className="px-5 py-3">Candidates</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recent.map((exam) => (
                      <tr key={exam._id} className="hover:bg-slate-50">
                        <td className="px-5 py-3">
                          <p className="font-medium text-slate-800">
                            {exam.title || "Untitled Exam"}
                          </p>
                          <p className="text-xs text-slate-500">
                            {exam.duration} min
                          </p>
                        </td>
                        <td className="px-5 py-3">
                          <StatusBadge status={exam.status} />
                        </td>
                        <td className="px-5 py-3 text-slate-600">
                          {formatDateTime(exam.startTime)}
                        </td>
                        <td className="px-5 py-3 text-slate-600">
                          {exam.candidates?.length || 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default TeacherDashboard;
