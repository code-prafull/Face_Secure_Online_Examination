function EmptyState({ icon, title, description, actionLabel, onAction }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
      {icon && (
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-2xl text-slate-400">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-slate-700">{title}</h3>
      {description && (
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export default EmptyState;
