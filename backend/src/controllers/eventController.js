const EventLog = require("../models/EventLog");
const Exam = require("../models/Exam");
const {
    createProctoringEvent
} = require("../services/eventService");

const createEvent = async (req, res) => {
    try {
        const { exam, eventType, details } = req.body;
        const candidate = req.user.id;

        if (!exam || !eventType) {
            return res.status(400).json({
                message: "Exam and event type are required"
            });
        }

        const allowedEvents = [
            "NO_FACE",
            "MULTIPLE_FACES",
            "MOBILE_DETECTED",
            "BOOK_DETECTED"
        ];

        if (!allowedEvents.includes(eventType)) {
            return res.status(400).json({
                message: "Invalid event type"
            });
        }

        const validExam = await Exam.findById(exam);

        if (!validExam) {
            return res.status(404).json({
                message: "Exam not found"
            });
        }

        const isCandidate = validExam.candidates.some(
            (id) => id.toString() === candidate
        );

        if (!isCandidate) {
            return res.status(403).json({
                message: "You are not assigned to this exam"
            });
        }

        const result = await createProctoringEvent({
            candidate,
            exam,
            eventType,
            details
        });

        res.status(201).json({
            message: "Event logged successfully",
            event: result.event,
            suspicionScore: result.suspicionScore
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to log event",
            error: error.message
        });
    }
};

const getEvents = async (req, res) => {
    try {
        const { candidateId, examId } = req.query;

        if (!candidateId || !examId) {
            return res.status(400).json({
                message: "Candidate ID and exam ID are required"
            });
        }

        const events = await EventLog.find({
            candidate: candidateId,
            exam: examId
        })
            .populate("candidate", "name email")
            .populate("exam", "title")
            .sort({ timestamp: -1 });

        res.status(200).json({
            events
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch events",
            error: error.message
        });
    }
};

module.exports = {
    createEvent,
    getEvents
};
