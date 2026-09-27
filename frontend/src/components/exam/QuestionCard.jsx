
import AnswerOption from "./AnswerOption";

function QuestionCard({
  question,
  questionNumber,
  selectedAnswer,
  onAnswerChange,
  disabled = false,
}) {
  if (!question) return null;

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-start justify-between gap-3">
        <h2 className="text-base font-semibold text-gray-800">
          Question {questionNumber}
        </h2>

        <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
          {question.marks ?? 1} marks
        </span>
      </div>

      <p className="mb-5 text-gray-800">
        {question.questionText}
      </p>

      <div className="space-y-3">
        {question.options?.map((option) => (
          <AnswerOption
            key={option.id}
            option={option}
            name={`question-${question._id}`}
            selected={selectedAnswer === option.id}
            onSelect={onAnswerChange}
            disabled={disabled}
          />
        ))}
      </div>
    </section>
  );
}

export default QuestionCard;
