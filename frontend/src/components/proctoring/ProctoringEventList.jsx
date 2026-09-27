import StatusBadge from "../common/StatusBadge";
import EmptyState from "../common/EmptyState";

function ProctoringEventList({ events = [] }) {
  if (events.length === 0) {
    return (
      <EmptyState
        title="No proctoring events"
        description="Detected events will appear here during the exam."
      />
    );
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">
          Recent Proctoring Events
        </h2>

        <span className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600">
          {events.length} events
        </span>
      </div>

      <div className="space-y-3">
        {events.map((event, index) => (
          <div
            key={event._id || `${event.eventType}-${event.timestamp}-${index}`}
            className="flex flex-col gap-2 rounded-lg border border-gray-100 p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="space-y-1">
              <StatusBadge status={event.eventType} />

              <p className="text-sm text-gray-700">
                {event.details || "No additional details"}
              </p>
            </div>

            <time className="shrink-0 text-xs text-gray-500">
              {event.timestamp
                ? new Date(event.timestamp).toLocaleString()
                : "Time unavailable"}
            </time>
          </div>
        ))}
      </div>
    </section>
  );
}

export default ProctoringEventList;
