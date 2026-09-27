
function ExamHeader({
  examTitle = "Online Examination",
  candidateName = "Candidate",
  remainingTime = "00:00",
}) {
  return (
    <header className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold text-gray-800">
            {examTitle}
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Candidate: {candidateName}
          </p>
        </div>

        <div
          className="shrink-0 rounded-lg bg-blue-50 px-4 py-2 text-center"
          aria-label={`Time remaining: ${remainingTime}`}
        >
          <p className="text-xs font-medium text-blue-700">
            Time Remaining
          </p>

          <p className="mt-1 font-mono text-xl font-bold tabular-nums text-blue-900">
            {remainingTime}
          </p>
        </div>
      </div>
    </header>
  );
}

export default ExamHeader;
