// Format a date string to a readable format
export const formatDate = (dateString) => {
  if (!dateString) return "—";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// Format a date string with time
export const formatDateTime = (dateString) => {
  if (!dateString) return "—";
  const date = new Date(dateString);
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Format duration in minutes to readable string
export const formatDuration = (minutes) => {
  if (!minutes) return "—";
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
};

// Format seconds to MM:SS
export const formatTime = (totalSeconds) => {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

// Get status color classes
export const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case "active":
      return "bg-green-100 text-green-700";
    case "completed":
      return "bg-slate-100 text-slate-600";
    case "upcoming":
      return "bg-blue-100 text-blue-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
};

// Get event type color classes
export const getEventTypeColor = (eventType) => {
  switch (eventType) {
    case "NO_FACE":
      return "bg-amber-100 text-amber-700";
    case "MULTIPLE_FACES":
      return "bg-red-100 text-red-700";
    case "MOBILE_DETECTED":
      return "bg-red-100 text-red-700";
    case "BOOK_DETECTED":
      return "bg-orange-100 text-orange-700";
    case "TAB_SWITCH":
      return "bg-purple-100 text-purple-700";
    case "COPY_PASTE":
      return "bg-red-100 text-red-700";
    case "RIGHT_CLICK":
      return "bg-fuchsia-100 text-fuchsia-700";
    case "FULLSCREEN_EXIT":
      return "bg-indigo-100 text-indigo-700";
    case "UNKNOWN_FACE":
      return "bg-red-100 text-red-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
};

// Truncate text to a maximum length
export const truncate = (text, maxLength = 50) => {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "…";
};

// Get initials from a name
export const getInitials = (name) => {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};
