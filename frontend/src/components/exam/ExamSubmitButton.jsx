
import { useState } from "react";
import ConfirmDialog from "../common/ConfirmDialog";

function ExamSubmitButton({
  onSubmit,
  disabled = false,
  unansweredCount = 0,
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (disabled || submitting) return;

    setSubmitting(true);

    try {
      await onSubmit?.();
      setShowConfirm(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="space-y-2">
        {unansweredCount > 0 && (
          <p className="text-sm text-amber-700">
            {unansweredCount} question(s) are unanswered.
          </p>
        )}

        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          disabled={disabled || submitting}
          className="w-full rounded-lg bg-green-600 px-5 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Submitting..." : "Submit Exam"}
        </button>
      </div>

      {showConfirm && (
        <ConfirmDialog
          title="Submit Exam?"
          message={
            unansweredCount > 0
              ? `You have ${unansweredCount} unanswered question(s). Are you sure you want to submit?`
              : "Are you sure you want to submit your exam?"
          }
          confirmText="Submit"
          cancelText="Review Answers"
          onConfirm={handleSubmit}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  );
}

export default ExamSubmitButton;
