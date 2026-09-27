
function QuestionNavigation({
  questions = [],
  currentIndex,
  answers = {},
  onNavigate,
  disabled = false,
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4">
      <h2 className="mb-4 text-base font-semibold text-gray-800">
        Question Navigation
      </h2>

      <div className="grid grid-cols-5 gap-2 sm:grid-cols-8">
        {questions.map((question, index) => {
          const answered = Boolean(answers[question._id]);
          const current = index === currentIndex;

          return (
            <button
              key={question._id}
              type="button"
              onClick={() => onNavigate?.(index)}
              disabled={disabled}
              aria-current={current ? "step" : undefined}
              aria-label={`Question ${index + 1}${
                answered ? ", answered" : ", unanswered"
              }`}
              className={`h-10 rounded-lg border text-sm font-semibold transition ${
                current
                  ? "border-blue-600 bg-blue-600 text-white"
                  : answered
                    ? "border-green-300 bg-green-50 text-green-700"
                    : "border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100"
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {index + 1}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-600">
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm bg-blue-600" />
          Current
        </span>

        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm bg-green-200" />
          Answered
        </span>

        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm border border-gray-300 bg-gray-50" />
          Unanswered
        </span>
      </div>
    </section>
  );
}

export default QuestionNavigation;
