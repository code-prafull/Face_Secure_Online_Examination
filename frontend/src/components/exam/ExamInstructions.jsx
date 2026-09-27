
import { useState } from "react";

const instructions = [
  "Keep your face visible in the webcam throughout the exam.",
  "Do not leave the examination screen while taking the exam.",
  "Do not use unauthorized books, phones, or other materials.",
  "Ensure you have a stable internet connection.",
  "Your proctoring events may be reviewed by an invigilator.",
];

function ExamInstructions({ onContinue, disabled = false }) {
  const [accepted, setAccepted] = useState(false);

  const handleContinue = () => {
    if (!accepted || disabled) return;
    onContinue?.();
  };

  return (
    <section className="mx-auto w-full max-w-2xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-gray-800">
        Exam Instructions
      </h2>

      <p className="mt-2 text-sm text-gray-600">
        Please read the following instructions before starting your exam.
      </p>

      <ul className="mt-5 list-disc space-y-3 pl-5 text-sm text-gray-700">
        {instructions.map((instruction, index) => (
          <li key={index}>{instruction}</li>
        ))}
      </ul>

      <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-lg bg-gray-50 p-4 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-1 h-4 w-4 accent-blue-600"
        />
        <span>
          I have read and understood the exam instructions.
        </span>
      </label>

      <button
        type="button"
        onClick={handleContinue}
        disabled={!accepted || disabled}
        className="mt-5 w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Continue to Exam
      </button>
    </section>
  );
}

export default ExamInstructions;
