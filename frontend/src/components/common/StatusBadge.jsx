const statusStyles = {
  active: "bg-green-100 text-green-700",
  upcoming: "bg-blue-100 text-blue-700",
  completed: "bg-slate-100 text-slate-600",
  scheduled: "bg-blue-100 text-blue-700",
  draft: "bg-amber-100 text-amber-700",
  passed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

function StatusBadge({ status = "scheduled" }) {
  const key = String(status).toLowerCase();
  const cls = statusStyles[key] || "bg-slate-100 text-slate-600";

  return (
    <span
      className={`inline-block shrink-0 rounded-full px-3 py-1 text-xs font-semibold capitalize ${cls}`}
    >
      {status}
    </span>
  );
}

export default StatusBadge;
