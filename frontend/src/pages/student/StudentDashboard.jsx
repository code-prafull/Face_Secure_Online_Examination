import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiBook,
  FiClock,
  FiCheckCircle,
  FiCalendar,
  FiArrowRight,
} from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";
import { getExams } from "../../services/examService";
import StatCard from "../../components/common/StateCard";
import StatusBadge from "../../components/common/StatusBadge";
import ErrorMessage from "../../components/common/ErrorMessage";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { formatDateTime } from "../../utils/formatters";

function StudentDashboard() {
  const { user } = useAuth();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchExams = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getExams();
      // Only exams assigned to this student (candidates array)
      const myId = user?.id;
      const mine = (data.exams || []).filter((e) =>
        (e.candidates || []).some((c) => (c._id || c) === myId)
      );
      setExams(mine.length > 0 ? mine : data.exams || []);
    } catch (err) {
      setError(err?.message || "Failed to load your exams.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchExams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const now = new Date();
  const active = exams.filter((e) => e.status === "active");
  const upcoming = exams.filter(
    (e) => e.status === "upcoming" || (e.startTime && new Date(e.startTime) > now)
  );
  const completed = exams.filter((e) => e.status === "completed");

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="rounded-xl border border-blue-200 bg-blue-600 p-6 text-white">
        <h1 className="text-xl font-bold">Welcome, {user?.name || "Student"}</h1>
        <p className="mt-1 text-sm text-blue-100">
          Your assigned examinations, schedule and results — all in one place.
        </p>
      </div>

      {loading && <LoadingSpinner label="Loading your exams..." />}
      {error && <ErrorMessage message={error} onRetry={fetchExams} />}

      {!loading && !error && (
        <>
          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              title="Available Now"
              value={active.length}
              icon={<FiBook />}
              accent="green"
              description="Active exams you can enter"
            />
            <StatCard
              title="Upcoming"
              value={upcoming.length}
              icon={<FiClock />}
              accent="blue"
            />
            <StatCard
              title="Completed"
              value={completed.length}
              icon={<FiCheckCircle />}
              accent="purple"
            />
          </div>

          {/* Active exams CTA */}
          {active.length > 0 && (
            <section className="rounded-xl border border-green-200 bg-green-50 p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="flex items-center gap-2 text-base font-semibold text-green-800">
                    <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-green-500" />
                    Exam in progress — {active[0].title}
                  </h2>
                  <p className="mt-1 text-sm text-green-700">
                    Duration {active[0].duration} min • starts{" "}
                    {formatDateTime(active[0].startTime)}
                  </p>
                </div>
                <Link
                  to={`/exam/${active[0]._id}`}
                  className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
                >
                  Enter Exam
                  <FiArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </section>
          )}

          {/* Upcoming list */}
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2 className="text-base font-semibold text-slate-800">
                Upcoming Examinations
              </h2>
              <Link
                to="/candidate/upcoming"
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                View all
              </Link>
            </div>

            {upcoming.length === 0 ? (
              <div className="p-8 text-center">
                <FiCalendar className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-3 text-sm text-slate-500">
                  No upcoming exams scheduled.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {upcoming.slice(0, 5).map((exam) => (
                  <li
                    key={exam._id}
                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {exam.title}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDateTime(exam.startTime)} • {exam.duration} min
                      </p>
                    </div>
                    <StatusBadge status={exam.status} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Recent results notice */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-800">
                  Recent Results
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {completed.length > 0
                    ? `${completed.length} completed exam(s) on record.`
                    : "No completed exams yet."}
                </p>
              </div>
              <Link
                to="/candidate/results"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                View Results
                <FiArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default StudentDashboard;
