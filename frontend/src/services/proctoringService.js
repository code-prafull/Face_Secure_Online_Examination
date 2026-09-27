import api from "./api";

// ================= Camera / object detection events =================

// Log a proctoring event to the backend (updates suspicion score)
export const sendProctoringEvent = async ({ exam, eventType, details = "" }) => {
  const response = await api.post("/events", {
    exam,
    eventType,
    details,
  });
  return response.data;
};

// Get proctoring events for a specific candidate and exam
export const getProctoringEvents = async (candidateId, examId) => {
  const response = await api.get("/events", {
    params: { candidateId, examId },
  });
  return response.data;
};

// Get suspicion score for a candidate and exam
export const getSuspicionScore = async (candidateId, examId) => {
  const response = await api.get(`/scores/${candidateId}/${examId}`);
  return response.data;
};

// ================= Behavioural violations (browser-level) =================

// POST /api/violations — tab switch, copy-paste, right-click, fullscreen exit
export const sendViolation = async ({ exam, type, details = "" }) => {
  const response = await api.post("/violations", { exam, type, details });
  return response.data;
};

// GET /api/violations?candidateId=&examId= (invigilator/admin)
export const getViolations = async (candidateId, examId) => {
  const response = await api.get("/violations", {
    params: { candidateId, examId },
  });
  return response.data;
};

// ================= Labels & descriptions =================

// Camera/object event types supported by POST /api/events
export const EVENT_TYPES = {
  NO_FACE: "NO_FACE",
  MULTIPLE_FACES: "MULTIPLE_FACES",
  MOBILE_DETECTED: "MOBILE_DETECTED",
  BOOK_DETECTED: "BOOK_DETECTED",
};

// Browser-level violation types supported by POST /api/violations
export const VIOLATION_TYPES = {
  TAB_SWITCH: "TAB_SWITCH",
  COPY_PASTE: "COPY_PASTE",
  RIGHT_CLICK: "RIGHT_CLICK",
  FULLSCREEN_EXIT: "FULLSCREEN_EXIT",
  UNKNOWN_FACE: "UNKNOWN_FACE",
};

// Display labels for all live-session incident types
export const EVENT_TYPE_LABELS = {
  NO_FACE: "No Face Detected",
  MULTIPLE_FACES: "Multiple Faces",
  MOBILE_DETECTED: "Mobile Detected",
  BOOK_DETECTED: "Book Detected",
  TAB_SWITCH: "Tab Switch",
  COPY_PASTE: "Copy/Paste Blocked",
  RIGHT_CLICK: "Right-Click Blocked",
  FULLSCREEN_EXIT: "Left Fullscreen",
  UNKNOWN_FACE: "Unrecognized Person",
};

// Descriptions for all live-session incident types
export const EVENT_TYPE_DESCRIPTIONS = {
  NO_FACE: "Candidate face was not visible for an extended period",
  MULTIPLE_FACES: "More than one face was detected in the camera frame",
  MOBILE_DETECTED: "A mobile phone was detected in the camera frame",
  BOOK_DETECTED: "A book or notebook was detected in the camera frame",
  TAB_SWITCH: "Candidate switched away from the exam tab or window",
  COPY_PASTE: "Candidate attempted to copy or paste during the exam",
  RIGHT_CLICK: "Candidate attempted to open the context menu",
  FULLSCREEN_EXIT: "Candidate exited fullscreen mode during the exam",
  UNKNOWN_FACE:
    "A face in the camera frame did not match the reference face captured at verification",
};

// NOTE: Gemini/Google AI summary endpoints are intentionally NOT used —
// session summaries are generated locally with a rule-based algorithm
// (src/utils/sessionSummary.js), so no external API key is required.
