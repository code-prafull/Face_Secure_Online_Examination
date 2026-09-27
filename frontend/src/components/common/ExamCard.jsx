
import { useNavigate } from "react-router-dom";
import StatusBadge from "./StatusBadge";

function ExamCard({ exam }) {
  const navigate = useNavigate();

  const isActive = exam.status?.toLowerCase() === "active";

  const formatDate = (date) => {
    if (!date) return "Not scheduled";

    return new Date(date).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const handleStartExam = () => {
    if (!exam._id || !isActive) return;
    navigate(`/exam/${exam._id}`);
  };

  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-800">
          {exam.title || "Untitled Exam"}
        </h2>

        <StatusBadge status={exam.status || "scheduled"} />
      </div>

      <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
        {exam.description || "No description available."}
      </p>

      <div className="mt-5 space-y-3 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-slate-500">Duration</span>
          <span className="font-medium text-slate-700">
            {exam.duration ? `${exam.duration} minutes` : "—"}
          </span>
        </div>

        <div className="flex items-start justify-between gap-3">
          <span className="text-slate-500">Start time</span>
          <span className="text-right font-medium text-slate-700">
            {formatDate(exam.startTime)}
          </span>
        </div>

        <div className="flex items-start justify-between gap-3">
          <span className="text-slate-500">End time</span>
          <span className="text-right font-medium text-slate-700">
            {formatDate(exam.endTime)}
          </span>
        </div>
      </div>

      <div className="mt-auto pt-6">
        <button
          type="button"
          onClick={handleStartExam}
          disabled={!isActive || !exam._id}
          className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isActive ? "Start Exam" : "Exam Unavailable"}
        </button>
      </div>
    </div>
  );
}

export default ExamCard;
