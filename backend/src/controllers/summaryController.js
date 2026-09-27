const EventLog = require("../models/EventLog");
const AISummary = require("../models/AISummary");
const { generateAISummary } = require("../services/geminiService");

const generateSummary = async (req, res) => {
    try {
        const { candidateId, examId } = req.params;

        const events = await EventLog.find({
            candidate: candidateId,
            exam: examId
        }).sort({ timestamp: 1 });

        if (events.length === 0) {
            return res.status(404).json({
                message: "No proctoring events found"
            });
        }

        const summaryText = await generateAISummary(events);

        const summary = await AISummary.create({
            candidate: candidateId,
            exam: examId,
            summary: summaryText,
            generatedBy: "Gemini"
        });

        res.status(201).json({
            message: "AI summary generated successfully",
            summary
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to generate AI summary",
            error: error.message
        });
    }
};

const getSummary = async (req, res) => {
    try {
        const { candidateId, examId } = req.params;

        const summary = await AISummary.findOne({
            candidate: candidateId,
            exam: examId
        })
            .populate("candidate", "name email")
            .populate("exam", "title")
            .sort({ createdAt: -1 });

        if (!summary) {
            return res.status(404).json({
                message: "AI summary not found"
            });
        }

        res.status(200).json({
            message: "AI summary fetched successfully",
            summary
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch AI summary",
            error: error.message
        });
    }
};

module.exports = {
    generateSummary,
    getSummary
};
