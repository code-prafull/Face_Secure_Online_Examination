import { FiAlertTriangle, FiRefreshCw } from "react-icons/fi";

function ErrorMessage({ message, onRetry }) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className="rounded-xl border border-red-200 bg-red-50 p-4"
    >
      <div className="flex items-start gap-3">
        <FiAlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
        <div className="flex-1">
          <p className="text-sm font-medium text-red-700">{message}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
            >
              <FiRefreshCw className="h-3.5 w-3.5" />
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ErrorMessage;
