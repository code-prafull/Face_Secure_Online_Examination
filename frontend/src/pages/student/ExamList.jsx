import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiBook, FiSearch } from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";
import { getExams } from "../../services/examService";
import PageHeader from "../../components/common/PageHeader";
import ErrorMessage from "../../components/common/ErrorMessage";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import ExamCard from "../../components/common/ExamCard";
import StatusBadge from "../../components/common/StatusBadge";
import { formatDateTime } from "../../utils/formatters";

/**
 * Shared exam list for student views.
 * mode: "available" | "upcoming" | "history"
 */
function ExamList({ mode = "available" }) {
  const { user } = useAuth();
  const navigate = useNavigate();
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
  }, []);

  const now = new Date();
  const filtered = exams.filter((e) => {
    const matchesSearch = e.title?.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    const start = e.startTime ? new Date(e.startTime) : null;
    switch (mode) {
      case "available":
        return e.status === "active";
      case "upcoming":
        return e.status === "upcoming" || (start && start > now);
      case "history":
        return e.status === "completed";
      default:
        return true;
    }
  });

  const meta = {
    available: {
      title: "Available Exams",
      desc: "Examinations you can enter right now.",
      empty: "No active exams right now. Check back during your scheduled exam time.",
    },
    upcoming: {
      title: "Upcoming Exams",
      desc: "Your scheduled future examinations.",
      empty: "No upcoming exams scheduled.",
    },
    history: {
      title: "Exam History",
      desc: "Examinations you have completed.",
      empty: "You have not completed any exams yet.",
    },
    all: {
      title: "My Exams",
      desc: "All examinations assigned to you.",
      empty: "No exams assigned yet.",
    },
  }[mode] || {
    title: "Exams",
    desc: "Examinations assigned to you.",
    empty: "No exams found.",
  };

  return (
    <div className="space-y-6">
      <PageHeader title={meta.title} description={meta.desc} />

      <div className="relative max-w-md">
        <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search exams..."
          className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      {loading && <LoadingSpinner label="Loading exams..." />}
      {error && <ErrorMessage message={error} onRetry={fetchExams} />}

      {!loading && !error && filtered.length === 0 && (
        <EmptyState icon={<FiBook />} title={search ? "No matches" : meta.title} description={search ? "Try another search term." : meta.empty} />
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((exam) => (
            <ExamCardWithAction
              key={exam._id}
              exam={exam}
              onOpen={() => navigate(`/exam/${exam._id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ExamCardWithAction({ exam, onOpen }) {
  const canStart = exam.status === "active";

  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-slate-800">
          {exam.title || "Untitled Exam"}
        </h3>
        <StatusBadge status={exam.status} />
      </div>

      <p className="mt-2 line-clamp-3 flex-1 text-sm text-slate-500">
        {exam.description || "No description available."}
      </p>

      <dl className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-slate-500">Duration</dt>
          <dd className="font-medium text-slate-700">{exam.duration} min</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Starts</dt>
          <dd className="font-medium text-slate-700">
            {formatDateTime(exam.startTime)}
          </dd>
        </div>
      </dl>

      <button
        type="button"
        onClick={onOpen}
        className={`mt-4 w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition ${
          canStart
            ? "bg-blue-600 hover:bg-blue-700"
            : "cursor-not-allowed bg-slate-300"
        }`}
        disabled={!canStart}
      >
        {canStart ? "Enter Exam" : exam.status === "completed" ? "Completed" : "Not Open Yet"}
      </button>
    </div>
  );
}

export default ExamList;
