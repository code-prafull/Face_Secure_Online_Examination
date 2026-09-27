
function StatCard({
  title,
  value = 0,
  description,
  icon,
  accent = "blue",
}) {
  const accentStyles = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-600",
    purple: "bg-purple-50 text-purple-600",
  };

  const iconStyle = accentStyles[accent] || accentStyles.blue;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-3xl font-bold tabular-nums text-slate-800">
            {value}
          </p>

          {description && (
            <p className="mt-2 text-xs text-slate-500">
              {description}
            </p>
          )}
        </div>

        {icon && (
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl ${iconStyle}`}
            aria-hidden="true"
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

export default StatCard;
