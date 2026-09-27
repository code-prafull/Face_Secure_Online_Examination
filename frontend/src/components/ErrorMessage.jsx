
function ErrorMessage({ message, onClose }) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className="flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
    >
      <div className="flex items-start gap-2">
        <span className="font-bold" aria-hidden="true">
          !
        </span>
        <p>{message}</p>
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss error"
          className="rounded px-2 font-bold text-red-700 hover:bg-red-100"
        >
          ×
        </button>
      )}
    </div>
  );
}

export default ErrorMessage;
