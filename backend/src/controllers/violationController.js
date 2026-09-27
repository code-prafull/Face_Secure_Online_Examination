const ViolationLog = require("../models/ViolationLog");
const SuspicionScore = require("../models/SuspicionScore");
const Exam = require("../models/Exam");

/**
 * Behavioural violation endpoints (additive — existing endpoints untouched).
 *
 *  POST /api/violations   candidate reports a browser-level violation
 *                         (tab switch, copy-paste, right-click, fullscreen exit)
 *  GET  /api/violations   invigilator/admin reads them per candidate+exam
 *
 * Every violation also increments the candidate's SuspicionScore so the
 * existing monitoring dashboards reflect it immediately.
 */

const VIOLATION_WEIGHTS = {
    TAB_SWITCH: 3,
    COPY_PASTE: 4,
    RIGHT_CLICK: 2,
    FULLSCREEN_EXIT: 3,
    // Camera-side identity violation (additive): a face in frame that does
    // not match the reference face captured at verification. Highest weight
    // because it can indicate a different person taking the exam.
    UNKNOWN_FACE: 6
};

// POST /api/violations  (candidate)
const createViolation = async (req, res) => {
    try {
        const { exam, type, details } = req.body;
        const candidate = req.user.id;

        if (!exam || !type) {
            return res.status(400).json({
                message: "Exam and violation type are required"
            });
        }

        if (!Object.prototype.hasOwnProperty.call(VIOLATION_WEIGHTS, type)) {
            return res.status(400).json({ message: "Invalid violation type" });
        }

        const validExam = await Exam.findById(exam);
        if (!validExam) {
            return res.status(404).json({ message: "Exam not found" });
        }

        const assigned = validExam.candidates.some(
            (id) => id.toString() === candidate
        );
        if (!assigned) {
            return res.status(403).json({ message: "You are not assigned to this exam" });
        }

        const violation = await ViolationLog.create({
            candidate,
            exam,
            type,
            details: details || "",
            timestamp: new Date()
        });

        const suspicionScore = await SuspicionScore.findOneAndUpdate(
            { candidate, exam },
            { $inc: { score: VIOLATION_WEIGHTS[type] } },
            { new: true, upsert: true, runValidators: true }
        );

        return res.status(201).json({ message: "Violation logged", violation, suspicionScore });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to log violation",
            error: error.message
        });
    }
};

// GET /api/violations?candidateId=..&examId=..  (invigilator/admin)
const getViolations = async (req, res) => {
    try {
        const { candidateId, examId } = req.query;

        if (!candidateId || !examId) {
            return res.status(400).json({
                message: "Candidate ID and exam ID are required"
            });
        }

        const violations = await ViolationLog.find({
            candidate: candidateId,
            exam: examId
        }).sort({ timestamp: -1 });

        return res.status(200).json({ violations });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to fetch violations",
            error: error.message
        });
    }
};

module.exports = {
    createViolation,
    getViolations
};
