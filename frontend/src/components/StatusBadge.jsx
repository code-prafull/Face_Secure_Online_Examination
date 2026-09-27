
const statusStyles = {
  active: "bg-green-100 text-green-700",
  scheduled: "bg-blue-100 text-blue-700",
  completed: "bg-slate-100 text-slate-700",
  cancelled: "bg-red-100 text-red-700",
  pending: "bg-yellow-100 text-yellow-700",
  NO_FACE: "bg-orange-100 text-orange-700",
  MULTIPLE_FACES: "bg-red-100 text-red-700",
  MOBILE_DETECTED: "bg-purple-100 text-purple-700",
  BOOK_DETECTED: "bg-amber-100 text-amber-700",
};

function StatusBadge({ status = "pending" }) {
  const normalizedStatus = String(status).trim();
  const style =
    statusStyles[normalizedStatus] ||
    "bg-slate-100 text-slate-700";

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${style}`}
    >
      {normalizedStatus.replaceAll("_", " ")}
    </span>
  );
}

export default StatusBadge;
