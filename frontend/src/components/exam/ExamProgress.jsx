
function ExamProgress({ totalQuestions = 0, answeredCount = 0 }) {
  const safeTotal = Math.max(0, totalQuestions);
  const safeAnswered = Math.min(
    safeTotal,
    Math.max(0, answeredCount)
  );

  const percentage =
    safeTotal === 0
      ? 0
      : Math.round((safeAnswered / safeTotal) * 100);

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-gray-800">
          Exam Progress
        </h2>

        <span className="text-sm font-medium text-blue-700">
          {safeAnswered} / {safeTotal} answered
        </span>
      </div>

      <div
        className="h-3 w-full overflow-hidden rounded-full bg-gray-100"
        role="progressbar"
        aria-label="Exam completion"
        aria-valuemin={0}
        aria-valuemax={safeTotal}
        aria-valuenow={safeAnswered}
      >
        <div
          className="h-full rounded-full bg-blue-600 transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>

      <p className="mt-2 text-right text-xs text-gray-500">
        {percentage}% completed
      </p>
    </section>
  );
}

export default ExamProgress;
