const Exam = require("../models/Exam");
const Question = require("../models/Question");
const Submission = require("../models/Submission");
const User = require("../models/User");
const SuspicionScore = require("../models/SuspicionScore");
const ViolationLog = require("../models/ViolationLog");

const createExam = async (req, res) => {
    try {
        const {
            title,
            description,
            duration,
            startTime,
            endTime,
            candidates
        } = req.body;

        const exam = await Exam.create({
            title,
            description,
            duration,
            startTime,
            endTime,
            candidates,
            createdBy: req.user.id
        });

        res.status(201).json({
            message: "Exam created successfully",
            exam
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to create exam",
            error: error.message
        });
    }
};

const getExams = async (req, res) => {
    try {
        const exams = await Exam.find()
            .populate("createdBy", "name email")
            .populate("candidates", "name email");

        res.json({
            exams
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch exams",
            error: error.message
        });
    }
};

const getExamById = async (req, res) => {
    try {
        const exam = await Exam.findById(req.params.id)
            .populate("createdBy", "name email")
            .populate("candidates", "name email");

        if (!exam) {
            return res.status(404).json({
                message: "Exam not found"
            });
        }

        res.json({
            exam
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch exam",
            error: error.message
        });
    }
};

// ---------------------------------------------------------------------------
// Additive endpoints (existing handlers above are untouched)
// ---------------------------------------------------------------------------

const isObjectId = (value) => /^[a-fA-F0-9]{24}$/.test(String(value));

// Invigilator policy: any invigilator/admin may manage (update, delete,
// change status, read results for) any exam — creator-only ownership is
// intentionally NOT required so teachers conduct exams by their own criteria.
const canManage = (exam, user) =>
    user.role === "invigilator" || user.role === "admin";

// Whitelisted fields for PUT /api/exams/:id
const UPDATABLE_FIELDS = [
    "title",
    "description",
    "duration",
    "startTime",
    "endTime",
    "candidates",
    "instructions",
    "totalMarks",
    "passingMarks",
    "requireCamera",
    "allowMultipleFaces"
];

const loadManageableExam = async (req, res) => {
    if (!isObjectId(req.params.id)) {
        res.status(400).json({ message: "Invalid exam id" });
        return null;
    }

    const exam = await Exam.findById(req.params.id);
    if (!exam) {
        res.status(404).json({ message: "Exam not found" });
        return null;
    }

    if (!canManage(exam, req.user)) {
        res.status(403).json({ message: "You do not manage this exam" });
        return null;
    }

    return exam;
};

// PUT /api/exams/:id  (owner / admin) — partial update + candidate assignment
const updateExam = async (req, res) => {
    try {
        const exam = await loadManageableExam(req, res);
        if (!exam) return;

        const body = req.body || {};

        // Candidate assignment must reference real candidate accounts
        if (body.candidates !== undefined) {
            if (!Array.isArray(body.candidates)) {
                return res.status(400).json({ message: "candidates must be an array" });
            }

            const ids = body.candidates
                .map((c) => String(c?._id || c))
                .filter((c) => isObjectId(c));

            const unique = [...new Set(ids)];

            const users = unique.length
                ? await User.find({ _id: { $in: unique }, role: "candidate" })
                      .select("_id")
                      .lean()
                : [];

            if (users.length !== unique.length) {
                return res.status(400).json({
                    message: "candidates must contain existing candidate accounts"
                });
            }

            exam.candidates = unique;
        }

        for (const field of UPDATABLE_FIELDS) {
            if (field === "candidates" || body[field] === undefined) continue;

            if (field === "duration" || field === "totalMarks" || field === "passingMarks") {
                const num = Number(body[field]);
                if (Number.isNaN(num) || num < 0) {
                    return res.status(400).json({ message: `${field} must be a non-negative number` });
                }
                exam[field] = num;
                continue;
            }

            if (field === "startTime" || field === "endTime") {
                const date = new Date(body[field]);
                if (Number.isNaN(date.getTime())) {
                    return res.status(400).json({ message: `${field} must be a valid date` });
                }
                exam[field] = date;
                continue;
            }

            if (field === "title") {
                const title = typeof body.title === "string" ? body.title.trim() : "";
                if (!title) return res.status(400).json({ message: "Title cannot be empty" });
                exam.title = title;
                continue;
            }

            exam[field] = body[field];
        }

        const start = new Date(exam.startTime).getTime();
        const end = new Date(exam.endTime).getTime();
        if (end <= start) {
            return res.status(400).json({ message: "End time must be after start time" });
        }

        await exam.save();

        const updated = await Exam.findById(exam._id)
            .populate("createdBy", "name email")
            .populate("candidates", "name email");

        res.status(200).json({
            message: "Exam updated successfully",
            exam: updated
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to update exam",
            error: error.message
        });
    }
};

// DELETE /api/exams/:id  (owner / admin) — cascades exam-scoped records
const deleteExam = async (req, res) => {
    try {
        const exam = await loadManageableExam(req, res);
        if (!exam) return;

        const [questions, submissions, suspicions, violations, events] =
            await Promise.all([
                Question.deleteMany({ exam: exam._id }),
                Submission.deleteMany({ exam: exam._id }),
                SuspicionScore.deleteMany({ exam: exam._id }),
                ViolationLog.deleteMany({ exam: exam._id }),
                require("../models/EventLog").deleteMany({ exam: exam._id }),
            ]);

        await exam.deleteOne();

        res.status(200).json({
            message: "Exam deleted successfully",
            removed: {
                questions: questions.deletedCount || 0,
                submissions: submissions.deletedCount || 0,
                suspicionScores: suspicions.deletedCount || 0,
                violations: violations.deletedCount || 0,
                events: events.deletedCount || 0
            }
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to delete exam",
            error: error.message
        });
    }
};

// PATCH /api/exams/:id/status  { status }  (owner / admin)
const updateExamStatus = async (req, res) => {
    try {
        const { status } = req.body || {};
        const allowed = ["upcoming", "active", "completed"];

        if (!allowed.includes(status)) {
            return res.status(400).json({
                message: `status must be one of: ${allowed.join(", ")}`
            });
        }

        const exam = await loadManageableExam(req, res);
        if (!exam) return;

        exam.status = status;
        await exam.save();

        res.status(200).json({
            message: `Exam marked ${status}`,
            exam: { _id: exam._id, title: exam.title, status: exam.status }
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to update exam status",
            error: error.message
        });
    }
};

// GET /api/exams/:id/results  (owner / admin)
// Academic report per assigned candidate + proctoring signals.
const getExamResults = async (req, res) => {
    try {
        const exam = await loadManageableExam(req, res);
        if (!exam) return;

        const [questions, submissions, suspicions, violations, users] =
            await Promise.all([
                Question.find({ exam: exam._id }).lean(),
                Submission.find({ exam: exam._id })
                    .populate("candidate", "name email")
                    .lean(),
                SuspicionScore.find({ exam: exam._id }).lean(),
                ViolationLog.find({ exam: exam._id }).select("candidate").lean(),
                User.find({ _id: { $in: exam.candidates || [] } })
                    .select("name email")
                    .lean(),
            ]);

        const mcqMax = questions
            .filter((q) => q.type === "mcq")
            .reduce((sum, q) => sum + (q.marks || 0), 0);
        const codingMax = questions
            .filter((q) => q.type === "coding")
            .reduce((sum, q) => sum + (q.marks || 0), 0);
        const maxScore = mcqMax + codingMax;

        const subByCandidate = new Map(
            submissions.map((s) => [String(s.candidate?._id || s.candidate), s])
        );
        const suspByCandidate = new Map(
            suspicions.map((s) => [String(s.candidate), s.score || 0])
        );
        const violByCandidate = new Map();
        violations.forEach((v) => {
            const key = String(v.candidate);
            violByCandidate.set(key, (violByCandidate.get(key) || 0) + 1);
        });

        const rows = users.map((u) => {
            const sub = subByCandidate.get(String(u._id));
            const autoScore = sub?.autoScore ?? null;
            const codingMarks = sub?.codingMarks ?? null;
            const obtained =
                sub != null
                    ? (sub.autoScore || 0) + (sub.codingMarks || 0)
                    : null;

            const passed =
                exam.passingMarks != null && obtained != null
                    ? obtained >= exam.passingMarks
                    : null;

            return {
                candidate: { _id: u._id, name: u.name, email: u.email },
                submitted: Boolean(sub),
                submittedAt: sub?.submittedAt || null,
                autoScore,
                totalMcqMarks: sub?.totalMcqMarks ?? null,
                codingMarks,
                reviewStatus: sub?.status || "pending",
                feedback: sub?.feedback || "",
                obtained,
                maxScore,
                percent:
                    obtained != null && maxScore > 0
                        ? Math.round((obtained / maxScore) * 100)
                        : null,
                passed,
                suspicion: suspByCandidate.get(String(u._id)) ?? 0,
                violations: violByCandidate.get(String(u._id)) || 0,
            };
        });

        const graded = rows.filter((r) => r.obtained != null);
        const summary = {
            assigned: rows.length,
            submitted: rows.filter((r) => r.submitted).length,
            graded: graded.length,
            avgObtained: graded.length
                ? Math.round(
                      (graded.reduce((s, r) => s + r.obtained, 0) / graded.length) * 100
                  ) / 100
                : null,
            avgPercent: graded.length
                ? Math.round(
                      graded.reduce((s, r) => s + (r.percent || 0), 0) / graded.length
                  )
                : null,
            passCount:
                exam.passingMarks != null
                    ? rows.filter((r) => r.passed === true).length
                    : null,
            passingMarks: exam.passingMarks ?? null,
        };

        res.status(200).json({
            exam: {
                _id: exam._id,
                title: exam.title,
                status: exam.status,
                startTime: exam.startTime,
                endTime: exam.endTime,
                duration: exam.duration,
                totalMarks: exam.totalMarks,
                passingMarks: exam.passingMarks,
            },
            mcqMax,
            codingMax,
            maxScore,
            rows,
            summary,
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch exam results",
            error: error.message
        });
    }
};

module.exports = {
    createExam,
    getExams,
    getExamById,
    updateExam,
    deleteExam,
    updateExamStatus,
    getExamResults
};
