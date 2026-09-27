
const alertConfig = {
  NO_FACE: {
    title: "Face Not Detected",
    message: "Please position your face clearly in the camera frame.",
    style: "border-amber-300 bg-amber-50 text-amber-800",
  },
  MULTIPLE_FACES: {
    title: "Multiple Faces Detected",
    message: "Only the registered candidate should be visible in the frame.",
    style: "border-red-300 bg-red-50 text-red-800",
  },
  MOBILE_DETECTED: {
    title: "Possible Mobile Phone Detected",
    message: "An object was detected that may require invigilator review.",
    style: "border-orange-300 bg-orange-50 text-orange-800",
  },
  BOOK_DETECTED: {
    title: "Possible Book Detected",
    message: "An object was detected that may require invigilator review.",
    style: "border-orange-300 bg-orange-50 text-orange-800",
  },
  IDENTITY_MISMATCH: {
    title: "Identity Check Needs Review",
    message: "The face comparison did not match the reference. Please contact the invigilator.",
    style: "border-purple-300 bg-purple-50 text-purple-800",
  },
};

function ProctoringAlert({ eventType, onDismiss }) {
  if (!eventType) return null;

  const alert = alertConfig[eventType] || {
    title: "Proctoring Notification",
    message: "A monitoring event has been recorded.",
    style: "border-slate-300 bg-slate-50 text-slate-800",
  };

  return (
    <div
      role="alert"
      className={`flex items-start justify-between gap-4 rounded-xl border p-4 ${alert.style}`}
    >
      <div>
        <h3 className="font-semibold">{alert.title}</h3>
        <p className="mt-1 text-sm leading-5">{alert.message}</p>
        <p className="mt-2 text-xs opacity-75">
          Automated detection may be inaccurate. An invigilator should review relevant events.
        </p>
      </div>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className="shrink-0 rounded-md px-2 py-1 text-lg font-semibold hover:bg-black/5"
        >
          ×
        </button>
      )}
    </div>
  );
}

export default ProctoringAlert;
