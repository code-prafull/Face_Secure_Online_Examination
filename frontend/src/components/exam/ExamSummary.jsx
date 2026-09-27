
function ExamSummary({
  questions = [],
  answers = {},
}) {
  const total = questions.length;

  const answered = questions.filter(
    (question) => Boolean(answers[question._id])
  ).length;

  const unanswered = total - answered;

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-gray-800">
        Exam Summary
      </h2>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-gray-50 p-3 text-center">
          <p className="text-2xl font-bold text-gray-800">{total}</p>
          <p className="mt-1 text-xs text-gray-500">Total</p>
        </div>

        <div className="rounded-lg bg-green-50 p-3 text-center">
          <p className="text-2xl font-bold text-green-700">
            {answered}
          </p>
          <p className="mt-1 text-xs text-green-700">Answered</p>
        </div>

        <div className="rounded-lg bg-amber-50 p-3 text-center">
          <p className="text-2xl font-bold text-amber-700">
            {unanswered}
          </p>
          <p className="mt-1 text-xs text-amber-700">Unanswered</p>
        </div>
      </div>

      <p className="mt-4 text-xs text-gray-500">
        Review unanswered questions before submitting your exam.
      </p>
    </section>
  );
}

export default ExamSummary;
