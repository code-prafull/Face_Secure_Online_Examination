const SuspicionScore = require("../models/SuspicionScore");

const eventScores = {
    NO_FACE: 2,
    MULTIPLE_FACES: 5,
    MOBILE_DETECTED: 5,
    BOOK_DETECTED: 3
};

const updateSuspicionScore = async ({
    candidate,
    exam,
    eventType
}) => {
    const points = eventScores[eventType];

    if (points === undefined) {
        throw new Error("Invalid event type");
    }

    const suspicionScore = await SuspicionScore.findOneAndUpdate(
        { candidate, exam },
        {
            $inc: { score: points }
        },
        {
            new: true,
            upsert: true,
            runValidators: true
        }
    );

    return suspicionScore;
};

module.exports = {
    updateSuspicionScore
};
