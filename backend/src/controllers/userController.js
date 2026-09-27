const User = require("../models/User");
const Exam = require("../models/Exam");
const Submission = require("../models/Submission");
const SuspicionScore = require("../models/SuspicionScore");
const ViolationLog = require("../models/ViolationLog");

/**
 * Student records endpoints (additive — existing controllers untouched).
 *  - GET /api/users/students        → candidate list with exam assignments
 *  - GET /api/users/:id/exams       → one student's exam history + results
 */

const isObjectId = (value) => /^[a-fA-F0-9]{24}$/.test(String(value));

// GET /api/users/students  (invigilator / admin)
const getStudents = async (req, res) => {
    try {
        const students = await User.find({ role: "candidate" })
            .select("name email createdAt")
            .sort({ name: 1 })
            .lean();

        const ids = students.map((s) => s._id);

        const exams = ids.length
            ? await Exam.find({ candidates: { $in: ids } })
                  .select("title status startTime endTime candidates")
                  .lean()
            : [];

        const rows = students.map((s) => ({
            id: s._id,
            name: s.name,
            email: s.email,
            joinedAt: s.createdAt,
            exams: exams
                .filter((e) => (e.candidates || []).some((c) => String(c) === String(s._id)))
                .map((e) => ({
                    id: e._id,
                    title: e.title,
                    status: e.status,
                    startTime: e.startTime
                }))
        }));

        res.status(200).json({
            message: "Students fetched successfully",
            students: rows
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch students",
            error: error.message
        });
    }
};

// GET /api/users/:id/exams  (invigilator / admin)
const getStudentExams = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isObjectId(id)) {
            return res.status(400).json({ message: "Invalid student id" });
        }

        const student = await User.findById(id).select("name email role").lean();
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        const [assignedExams, submissions, suspicions, violations] = await Promise.all([
            Exam.find({ candidates: student._id })
                .select("title status startTime endTime totalMarks passingMarks")
                .lean(),
            Submission.find({ candidate: student._id }).lean(),
            SuspicionScore.find({ candidate: student._id }).lean(),
            ViolationLog.find({ candidate: student._id }).select("exam").lean()
        ]);

        const subByExam = new Map(submissions.map((s) => [String(s.exam), s]));
        const suspByExam = new Map(suspicions.map((s) => [String(s.exam), s.score]));
        const violCountByExam = new Map();
        violations.forEach((v) => {
            const key = String(v.exam);
            violCountByExam.set(key, (violCountByExam.get(key) || 0) + 1);
        });

        const rows = assignedExams.map((exam) => {
            const sub = subByExam.get(String(exam._id));
            const obtained = sub ? (sub.autoScore || 0) + (sub.codingMarks || 0) : null;

            return {
                examId: exam._id,
                title: exam.title,
                status: exam.status,
                startTime: exam.startTime,
                endTime: exam.endTime,
                submitted: Boolean(sub),
                submittedAt: sub?.submittedAt || null,
                autoScore: sub?.autoScore ?? null,
                totalMcqMarks: sub?.totalMcqMarks ?? null,
                codingMarks: sub?.codingMarks ?? null,
                resultStatus: sub?.status || "pending",
                obtained,
                suspicion: suspByExam.get(String(exam._id)) ?? 0,
                violations: violCountByExam.get(String(exam._id)) || 0
            };
        });

        res.status(200).json({
            message: "Student exam history fetched successfully",
            student: {
                id: student._id,
                name: student.name,
                email: student.email
            },
            exams: rows
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch student exam history",
            error: error.message
        });
    }
};

module.exports = {
    getStudents,
    getStudentExams
};
