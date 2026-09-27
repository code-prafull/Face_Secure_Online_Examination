const Exam = require("../models/Exam");
const User = require("../models/User");
const Submission = require("../models/Submission");
const EventLog = require("../models/EventLog");
const ViolationLog = require("../models/ViolationLog");
const SuspicionScore = require("../models/SuspicionScore");

/**
 * Platform analytics (additive — existing controllers untouched).
 * GET /api/analytics  (invigilator / admin)
 * Real counters + distributions for dashboard stat cards.
 */
const getAnalytics = async (req, res) => {
    try {
        const [
            examCount,
            studentCount,
            submissionCount,
            eventGroups,
            violationGroups,
            suspicionAgg,
        ] = await Promise.all([
            Exam.countDocuments(),
            User.countDocuments({ role: "candidate" }),
            Submission.countDocuments(),
            EventLog.aggregate([
                { $group: { _id: "$eventType", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
            ]),
            ViolationLog.aggregate([
                { $group: { _id: "$type", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
            ]),
            SuspicionScore.aggregate([
                {
                    $group: {
                        _id: null,
                        average: { $avg: "$score" },
                        max: { $max: "$score" },
                        tracked: { $sum: 1 },
                    },
                },
            ]),
        ]);

        const toMap = (groups) =>
            groups.reduce((acc, g) => {
                acc[g._id || "UNKNOWN"] = g.count;
                return acc;
            }, {});

        const suspicion = suspicionAgg[0] || null;

        res.status(200).json({
            message: "Analytics fetched successfully",
            totals: {
                exams: examCount,
                students: studentCount,
                submissions: submissionCount,
                events: eventGroups.reduce((s, g) => s + g.count, 0),
                violations: violationGroups.reduce((s, g) => s + g.count, 0),
            },
            eventsByType: toMap(eventGroups),
            violationsByType: toMap(violationGroups),
            suspicion: suspicion
                ? {
                      average: Math.round(suspicion.average * 100) / 100,
                      max: suspicion.max,
                      tracked: suspicion.tracked,
                  }
                : { average: 0, max: 0, tracked: 0 },
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch analytics",
            error: error.message
        });
    }
};

module.exports = { getAnalytics };
