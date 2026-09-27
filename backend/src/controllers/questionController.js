const Question = require("../models/Question");
const Exam = require("../models/Exam");

/**
 * Question bank endpoints (additive — existing endpoints untouched).
 * All routes are exam-scoped: /api/exams/:examId/questions
 */

const loadOwnedExam = async (examId, user) => {
    const exam = await Exam.findById(examId);
    if (!exam) return { error: 404, message: "Exam not found" };

    // Invigilator policy: any invigilator/admin may conduct any exam by
    // their own criteria — creator-only ownership is intentionally NOT
    // required here (candidates are still blocked by route role middleware).
    if (user.role !== "invigilator" && user.role !== "admin") {
        return { error: 403, message: "Only invigilators can manage exams" };
    }
    return { exam };
};

// POST /api/exams/:examId/questions  (invigilator/admin, exam owner)
const createQuestion = async (req, res) => {
    try {
        const { examId } = req.params;
        const {
            type = "mcq",
            questionText,
            options,
            correctOption,
            marks,
            language,
            starterCode,
            expectedApproach,
            order
        } = req.body;

        const { error, message, exam } = await loadOwnedExam(examId, req.user);
        if (error) return res.status(error).json({ message });

        if (!questionText || !questionText.trim()) {
            return res.status(400).json({ message: "Question text is required" });
        }

        if (type === "mcq") {
            if (!Array.isArray(options) || options.length < 2) {
                return res.status(400).json({
                    message: "MCQ questions need at least 2 options"
                });
            }
            const normalised = options.map((opt, index) => ({
                id: opt.id || String.fromCharCode(97 + index),
                text: String(opt.text || "").trim()
            }));
            if (normalised.some((o) => !o.text)) {
                return res.status(400).json({ message: "Option text cannot be empty" });
            }
            if (!correctOption || !normalised.some((o) => o.id === correctOption)) {
                return res.status(400).json({
                    message: "correctOption must match one of the option ids"
                });
            }

            const question = await Question.create({
                exam: exam._id,
                type: "mcq",
                questionText: questionText.trim(),
                options: normalised,
                correctOption,
                marks: Number.isFinite(Number(marks)) ? Number(marks) : 1,
                order: Number.isFinite(Number(order)) ? Number(order) : 0
            });

            return res.status(201).json({ message: "Question added", question });
        }

        // coding question
        const question = await Question.create({
            exam: exam._id,
            type: "coding",
            questionText: questionText.trim(),
            marks: Number.isFinite(Number(marks)) ? Number(marks) : 10,
            language: language || "javascript",
            starterCode: starterCode || "",
            expectedApproach: expectedApproach || "",
            order: Number.isFinite(Number(order)) ? Number(order) : 0
        });

        return res.status(201).json({ message: "Question added", question });
    } catch (err) {
        return res.status(500).json({
            message: "Failed to create question",
            error: err.message
        });
    }
};

// GET /api/exams/:examId/questions
// candidates: assigned check + correct answers stripped
// invigilator/admin (owner): full including correctOption
const getQuestions = async (req, res) => {
    try {
        const { examId } = req.params;
        const exam = await Exam.findById(examId);
        if (!exam) return res.status(404).json({ message: "Exam not found" });

        const isCandidate = req.user.role === "candidate";
        if (isCandidate) {
            const assigned = exam.candidates.some(
                (id) => id.toString() === req.user.id.toString()
            );
            if (!assigned) {
                return res.status(403).json({ message: "You are not assigned to this exam" });
            }
        } else {
            // Invigilator policy: any invigilator/admin can open any exam's
            // questions (full version incl. answers) to conduct it themselves.
            if (req.user.role !== "invigilator" && req.user.role !== "admin") {
                return res.status(403).json({ message: "Access denied" });
            }
        }

        const questions = await Question.find({ exam: exam._id }).sort({ order: 1, createdAt: 1 });

        if (isCandidate) {
            // Strip answers before they reach the exam client
            const safe = questions.map((q) => ({
                _id: q._id,
                type: q.type,
                questionText: q.questionText,
                options: q.options,
                marks: q.marks,
                language: q.language,
                starterCode: q.starterCode,
                order: q.order
            }));
            return res.status(200).json({ questions: safe });
        }

        return res.status(200).json({ questions });
    } catch (err) {
        return res.status(500).json({
            message: "Failed to fetch questions",
            error: err.message
        });
    }
};

// DELETE /api/exams/:examId/questions/:questionId  (owner)
const deleteQuestion = async (req, res) => {
    try {
        const { examId, questionId } = req.params;
        const { error, message } = await loadOwnedExam(examId, req.user);
        if (error) return res.status(error).json({ message });

        const question = await Question.findOneAndDelete({
            _id: questionId,
            exam: examId
        });
        if (!question) return res.status(404).json({ message: "Question not found" });

        return res.status(200).json({ message: "Question deleted" });
    } catch (err) {
        return res.status(500).json({
            message: "Failed to delete question",
            error: err.message
        });
    }
};

module.exports = {
    createQuestion,
    getQuestions,
    deleteQuestion
};
