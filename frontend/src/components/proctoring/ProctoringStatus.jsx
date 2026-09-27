
const statusConfig = {
  ready: {
    label: "Ready",
    dot: "bg-green-500",
    text: "text-green-700",
    background: "bg-green-50",
  },
  loading: {
    label: "Loading",
    dot: "bg-amber-500",
    text: "text-amber-700",
    background: "bg-amber-50",
  },
  warning: {
    label: "Needs Attention",
    dot: "bg-orange-500",
    text: "text-orange-700",
    background: "bg-orange-50",
  },
  error: {
    label: "Unavailable",
    dot: "bg-red-500",
    text: "text-red-700",
    background: "bg-red-50",
  },
};

function StatusItem({ label, status = "loading" }) {
  const config = statusConfig[status] || statusConfig.loading;

  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-3 last:border-0">
      <span className="text-sm text-slate-600">{label}</span>

      <span
        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${config.background} ${config.text}`}
      >
        <span className={`h-2 w-2 rounded-full ${config.dot}`} />
        {config.label}
      </span>
    </div>
  );
}

function ProctoringStatus({
  camera = "loading",
  faceDetection = "loading",
  eventMonitoring = "loading",
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3">
        <h2 className="text-base font-semibold text-slate-800">
          Proctoring Status
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Current monitoring component status
        </p>
      </div>

      <StatusItem label="Camera" status={camera} />
      <StatusItem label="Face Detection" status={faceDetection} />
      <StatusItem label="Event Monitoring" status={eventMonitoring} />

      <p className="mt-3 text-xs leading-5 text-slate-500">
        Status indicators show technical availability, not proof that every
        detection is accurate or that an exam is free from misconduct.
      </p>
    </section>
  );
}

export default ProctoringStatus;
