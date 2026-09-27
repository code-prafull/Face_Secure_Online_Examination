const EventLog = require("../models/EventLog");
const { updateSuspicionScore } = require("./scoreService");

const createProctoringEvent = async ({
    candidate,
    exam,
    eventType,
    details
}) => {
    const event = await EventLog.create({
        candidate,
        exam,
        eventType,
        timestamp: new Date(),
        details: details || ""
    });

    const suspicionScore = await updateSuspicionScore({
        candidate,
        exam,
        eventType
    });

    return {
        event,
        suspicionScore
    };
};

module.exports = {
    createProctoringEvent
};
