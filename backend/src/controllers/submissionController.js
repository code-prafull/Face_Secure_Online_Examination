const Question = require("../models/Question");
const Exam = require("../models/Exam");
const Submission = require("../models/Submission");

/**
 * Exam submission + results endpoints (additive — existing endpoints untouched).
 *
 *  POST  /api/exams/:examId/submit                      candidate submits answers (MCQ auto-graded)
 *  GET   /api/exams/:examId/my-result                   candidate reads own score
 *  GET   /api/exams/:examId/submissions                 invigilator/admin (owner) reads all attempts
 *  PATCH /api/exams/:examId/submissions/:submissionId/review   invigilator scores code + feedback
 */

// Invigilator policy: any invigilator/admin may read and grade any exam —
// creator-only ownership is intentionally NOT required so teachers can
// conduct exams by their own criteria (candidates are blocked by the
// route-level role middleware before reaching here).
const isOwner = (exam, user) =>
    user.role === "invigilator" || user.role === "admin";

const examOf = async (req, res) => {
    const exam = await Exam.findById(req.params.examId);
    if (!exam) {
        res.status(404).json({ message: "Exam not found" });
        return null;
    }
    return exam;
};

// POST /api/exams/:examId/submit  (assigned candidate)
const submitExamAnswers = async (req, res) => {
    try {
        const exam = await examOf(req, res);
        if (!exam) return;

        const assigned = exam.candidates.some(
            (id) => id.toString() === req.user.id.toString()
        );
        if (!assigned) {
            return res.status(403).json({ message: "You are not assigned to this exam" });
        }

        const incoming = Array.isArray(req.body.answers) ? req.body.answers : [];

        const questions = await Question.find({ exam: exam._id });
        const questionMap = new Map(questions.map((q) => [q._id.toString(), q]));

        let autoScore = 0;
        let totalMcqMarks = 0;

        const answers = incoming
            .filter((a) => a && a.question)
            .map((a) => {
                const question = questionMap.get(String(a.question));
                if (!question) return null;

                if (question.type === "mcq") {
                    totalMcqMarks += question.marks || 0;
                    if (
                        a.selectedOption &&
                        question.correctOption &&
                        a.selectedOption === question.correctOption
                    ) {
                        autoScore += question.marks || 0;
                    }
                    return {
                        question: question._id,
                        selectedOption: a.selectedOption || null
                    };
                }

                return {
                    question: question._id,
                    code: String(a.code || ""),
                    language: a.language || question.language || "javascript"
                };
            })
            .filter(Boolean);

        // One attempt: idempotent replace while still "submitted";
        // once reviewed, the attempt is locked.
        const existing = await Submission.findOne({
            candidate: req.user.id,
            exam: exam._id
        });

        if (existing && existing.status === "reviewed") {
            return res.status(409).json({
                message: "This exam has already been graded and locked"
            });
        }

        const update = {
            answers,
            autoScore,
            totalMcqMarks,
            submittedAt: new Date(),
            status: "submitted"
        };

        const submission = await Submission.findOneAndUpdate(
            { candidate: req.user.id, exam: exam._id },
            { $set: update },
            { new: true, upsert: true, runValidators: true }
        );

        const hasCoding = questions.some((q) => q.type === "coding");

        return res.status(201).json({
            message: hasCoding
                ? "Submitted — MCQ score calculated, coding answers await teacher review"
                : "Submitted successfully",
            submission: {
                _id: submission._id,
                autoScore: submission.autoScore,
                totalMcqMarks: submission.totalMcqMarks,
                status: submission.status,
                submittedAt: submission.submittedAt
            }
        });
    } catch (err) {
        return res.status(500).json({
            message: "Failed to submit exam",
            error: err.message
        });
    }
};

// GET /api/exams/:examId/my-result  (candidate)
const getMyResult = async (req, res) => {
    try {
        const exam = await examOf(req, res);
        if (!exam) return;

        const submission = await Submission.findOne({
            candidate: req.user.id,
            exam: exam._id
        });

        if (!submission) {
            return res.status(200).json({ result: null, submitted: false });
        }

        const questions = await Question.find({ exam: exam._id });
        const codingTotal = questions
            .filter((q) => q.type === "coding")
            .reduce((sum, q) => sum + (q.marks || 0), 0);

        return res.status(200).json({
            submitted: true,
            result: {
                _id: submission._id,
                autoScore: submission.autoScore,
                totalMcqMarks: submission.totalMcqMarks,
                codingMarks: submission.codingMarks,
                codingTotal,
                totalScore: submission.autoScore + (submission.codingMarks || 0),
                feedback: submission.feedback || "",
                status: submission.status,
                submittedAt: submission.submittedAt
            }
        });
    } catch (err) {
        return res.status(500).json({
            message: "Failed to fetch result",
            error: err.message
        });
    }
};

// GET /api/exams/:examId/submissions  (invigilator owner / admin)
const getExamSubmissions = async (req, res) => {
    try {
        const exam = await examOf(req, res);
        if (!exam) return;

        if (!isOwner(exam, req.user)) {
            return res.status(403).json({ message: "You do not manage this exam" });
        }

        const submissions = await Submission.find({ exam: exam._id })
            .populate("candidate", "name email")
            .sort({ submittedAt: 1 });

        const questions = await Question.find({ exam: exam._id });
        const codingTotal = questions
            .filter((q) => q.type === "coding")
            .reduce((sum, q) => sum + (q.marks || 0), 0);

        return res.status(200).json({ submissions, codingTotal });
    } catch (err) {
        return res.status(500).json({
            message: "Failed to fetch submissions",
            error: err.message
        });
    }
};

// PATCH /api/exams/:examId/submissions/:submissionId/review  (invigilator owner / admin)
const reviewSubmission = async (req, res) => {
    try {
        const exam = await examOf(req, res);
        if (!exam) return;

        if (!isOwner(exam, req.user)) {
            return res.status(403).json({ message: "You do not manage this exam" });
        }

        const { codingMarks, feedback } = req.body;
        const marks = codingMarks === null || codingMarks === undefined
            ? null
            : Number(codingMarks);

        if (marks !== null && (Number.isNaN(marks) || marks < 0)) {
            return res.status(400).json({ message: "codingMarks must be >= 0" });
        }

        const submission = await Submission.findOne({
            _id: req.params.submissionId,
            exam: exam._id
        });
        if (!submission) {
            return res.status(404).json({ message: "Submission not found" });
        }

        if (marks !== null) submission.codingMarks = marks;
        if (typeof feedback === "string") submission.feedback = feedback.trim();
        submission.status = "reviewed";
        await submission.save();

        return res.status(200).json({
            message: "Review saved",
            submission: {
                _id: submission._id,
                autoScore: submission.autoScore,
                codingMarks: submission.codingMarks,
                feedback: submission.feedback,
                status: submission.status,
                totalScore: submission.autoScore + (submission.codingMarks || 0)
            }
        });
    } catch (err) {
        return res.status(500).json({
            message: "Failed to save review",
            error: err.message
        });
    }
};

module.exports = {
    submitExamAnswers,
    getMyResult,
    getExamSubmissions,
    reviewSubmission
};
