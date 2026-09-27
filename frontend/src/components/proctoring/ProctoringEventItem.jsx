import StatusBadge from "../common/StatusBadge";

function ProctoringEventItem({ event }) {
  if (!event) return null;

  const timestamp = event.timestamp
    ? new Date(event.timestamp).toLocaleString()
    : "Time unavailable";

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-2">
        <StatusBadge status={event.eventType} />

        <p className="text-sm text-gray-700">
          {event.details || "No additional details"}
        </p>
      </div>

      <time className="shrink-0 text-xs text-gray-500">
        {timestamp}
      </time>
    </div>
  );
}

export default ProctoringEventItem;
