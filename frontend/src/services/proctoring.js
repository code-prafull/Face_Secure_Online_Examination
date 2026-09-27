import api from "./api";

// Send a proctoring event to the backend
export const sendProctoringEvent = async ({
  exam,
  eventType,
  details = "",
}) => {
  try {
    const response = await api.post("/events", {
      exam,
      eventType,
      details,
    });

    return response.data;
  } catch (error) {
    console.error(
      "Failed to send proctoring event:",
      error.response?.data || error.message
    );

    throw error;
  }
};
