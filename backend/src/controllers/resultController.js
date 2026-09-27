const Exam = require("../models/Exam");
const Submission = require("../models/Submission");
const SuspicionScore = require("../models/SuspicionScore");
const ViolationLog = require("../models/ViolationLog");

/**
 * Results overview (additive — existing controllers untouched).
 * GET /api/results  (invigilator / admin)
 * Per-exam academic + integrity roll-up, built from real submissions,
 * suspicion scores and violation logs.
 */
const getResults = async (req, res) => {
    try {
        const [exams, submissions, suspicions, violations] = await Promise.all([
            Exam.find()
                .select("title status startTime endTime candidates createdBy")
                .lean(),
            Submission.find()
                .select("exam candidate autoScore codingMarks status submittedAt")
                .lean(),
            SuspicionScore.find().select("exam score").lean(),
            ViolationLog.find().select("exam").lean(),
        ]);

        const subsByExam = new Map();
        submissions.forEach((s) => {
            const key = String(s.exam);
            if (!subsByExam.has(key)) subsByExam.set(key, []);
            subsByExam.get(key).push(s);
        });

        const suspByExam = new Map();
        suspicions.forEach((s) => {
            const key = String(s.exam);
            const list = suspByExam.get(key) || [];
            list.push(s.score || 0);
            suspByExam.set(key, list);
        });

        const violByExam = new Map();
        violations.forEach((v) => {
            const key = String(v.exam);
            violByExam.set(key, (violByExam.get(key) || 0) + 1);
        });

        const mean = (arr) =>
            arr.length
                ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 100) / 100
                : null;

        const rows = exams.map((exam) => {
            const subs = subsByExam.get(String(exam._id)) || [];
            const suspList = suspByExam.get(String(exam._id)) || [];

            const obtainedList = subs.map(
                (s) => (s.autoScore || 0) + (s.codingMarks || 0)
            );

            return {
                examId: exam._id,
                title: exam.title,
                status: exam.status,
                startTime: exam.startTime,
                endTime: exam.endTime,
                assigned: (exam.candidates || []).length,
                submitted: subs.length,
                reviewed: subs.filter((s) => s.status === "reviewed").length,
                avgAutoScore: mean(subs.map((s) => s.autoScore || 0)),
                avgObtained: mean(obtainedList),
                avgSuspicion: mean(suspList),
                violations: violByExam.get(String(exam._id)) || 0,
            };
        });

        rows.sort(
            (a, b) => new Date(b.startTime) - new Date(a.startTime)
        );

        res.status(200).json({
            message: "Results fetched successfully",
            results: rows,
            summary: {
                exams: rows.length,
                assignedSeats: rows.reduce((s, r) => s + r.assigned, 0),
                submissions: rows.reduce((s, r) => s + r.submitted, 0),
                totalViolations: rows.reduce((s, r) => s + r.violations, 0),
                avgSuspicion: mean(
                    rows.filter((r) => r.avgSuspicion != null).map((r) => r.avgSuspicion)
                ),
            },
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch results overview",
            error: error.message
        });
    }
};

module.exports = { getResults };
