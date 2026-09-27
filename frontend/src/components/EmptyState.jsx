
function EmptyState({
  title = "No data found",
  message = "There is nothing to display right now.",
  actionLabel,
  onAction,
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-2xl text-slate-500">
        <span aria-hidden="true">∅</span>
      </div>

      <h2 className="text-lg font-semibold text-slate-800">
        {title}
      </h2>

      <p className="mt-2 max-w-md text-sm text-slate-500">
        {message}
      </p>

      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export default EmptyState;
