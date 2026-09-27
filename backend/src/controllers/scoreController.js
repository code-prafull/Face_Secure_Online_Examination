const SuspicionScore = require("../models/SuspicionScore");
const Submission = require("../models/Submission");
const ViolationLog = require("../models/ViolationLog");

const getScore = async (req, res) => {
    try {
        const { candidateId, examId } = req.params;

        const score = await SuspicionScore.findOne({
            candidate: candidateId,
            exam: examId
        })
            .populate("candidate", "name email")
            .populate("exam", "title");

        if (!score) {
            return res.status(404).json({
                message: "Suspicion score not found"
            });
        }

        res.status(200).json({
            message: "Suspicion score fetched successfully",
            score
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch suspicion score",
            error: error.message
        });
    }
};

// ---------------------------------------------------------------------------
// Additive endpoint (existing handler above is untouched)
// ---------------------------------------------------------------------------

const isObjectId = (value) => /^[a-fA-F0-9]{24}$/.test(String(value));

// GET /api/scores/student/:studentId  (invigilator / admin)
// Everything academic + integrity related for one student across exams.
const getStudentResults = async (req, res) => {
    try {
        const { studentId } = req.params;

        if (!isObjectId(studentId)) {
            return res.status(400).json({ message: "Invalid student id" });
        }

        const [submissions, scores, violations] = await Promise.all([
            Submission.find({ candidate: studentId })
                .populate("exam", "title status startTime endTime passingMarks")
                .lean(),
            SuspicionScore.find({ candidate: studentId })
                .populate("exam", "title")
                .lean(),
            ViolationLog.find({ candidate: studentId })
                .select("exam type timestamp")
                .lean(),
        ]);

        const suspByExam = new Map(
            scores.map((s) => [String(s.exam?._id || s.exam), s.score || 0])
        );

        const violCountByExam = new Map();
        violations.forEach((v) => {
            const key = String(v.exam);
            violCountByExam.set(key, (violCountByExam.get(key) || 0) + 1);
        });

        const results = submissions
            .filter((s) => s.exam)
            .map((s) => ({
                examId: s.exam._id,
                title: s.exam.title,
                examStatus: s.exam.status,
                startTime: s.exam.startTime,
                submittedAt: s.submittedAt,
                autoScore: s.autoScore,
                totalMcqMarks: s.totalMcqMarks,
                codingMarks: s.codingMarks,
                status: s.status,
                obtained: (s.autoScore || 0) + (s.codingMarks || 0),
                passingMarks: s.exam.passingMarks ?? null,
                passed:
                    s.exam.passingMarks != null
                        ? (s.autoScore || 0) + (s.codingMarks || 0) >= s.exam.passingMarks
                        : null,
                suspicion: suspByExam.get(String(s.exam._id)) ?? 0,
                violations: violCountByExam.get(String(s.exam._id)) || 0,
            }))
            .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

        res.status(200).json({
            message: "Student results fetched successfully",
            results,
            totals: {
                examsTaken: results.length,
                avgObtained: results.length
                    ? Math.round(
                          (results.reduce((s, r) => s + r.obtained, 0) /
                              results.length) *
                              100
                      ) / 100
                    : 0,
                totalViolations: violations.length,
            },
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch student results",
            error: error.message
        });
    }
};

module.exports = {
    getScore,
    getStudentResults
};
