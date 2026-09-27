const API_URL = "http://localhost:5000/api";

export const sendProctoringEvent = async ({
    candidate,
    exam,
    eventType,
    details
}) => {
    try {
        const response = await fetch(`${API_URL}/events`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({
                candidate,
                exam,
                eventType,
                details
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Failed to send event");
        }

        return data;
    } catch (error) {
        console.error("Proctoring event API error:", error);
        throw error;
    }
};
