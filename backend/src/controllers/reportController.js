const { jsPDF } = require("jspdf");

const Exam = require("../models/Exam");
const Question = require("../models/Question");
const Submission = require("../models/Submission");
const User = require("../models/User");
const SuspicionScore = require("../models/SuspicionScore");
const ViolationLog = require("../models/ViolationLog");

/**
 * PDF report export (additive — existing controllers untouched).
 * GET /api/reports/pdf?examId=<id>   (invigilator / admin)
 *
 * With examId → full academic + proctoring report for that exam.
 * Without     → summary table across every exam.
 * Uses jsPDF (already a backend dependency); no external services.
 */

const isObjectId = (value) => /^[a-fA-F0-9]{24}$/.test(String(value));
const round2 = (n) => Math.round(n * 100) / 100;

const buildExamSection = async (doc, exam, startY) => {
    let y = startY;

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
        .reduce((s, q) => s + (q.marks || 0), 0);
    const codingMax = questions
        .filter((q) => q.type === "coding")
        .reduce((s, q) => s + (q.marks || 0), 0);
    const maxScore = mcqMax + codingMax;

    const subByCand = new Map(
        submissions.map((s) => [String(s.candidate?._id || s.candidate), s])
    );
    const suspByCand = new Map(
        suspicions.map((s) => [String(s.candidate), s.score || 0])
    );
    const violByCand = new Map();
    violations.forEach((v) => {
        const key = String(v.candidate);
        violByCand.set(key, (violByCand.get(key) || 0) + 1);
    });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(String(exam.title || "Untitled Exam"), 40, y);
    y += 16;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(90);
    doc.text(
        `Status: ${exam.status}   |   Window: ${new Date(
            exam.startTime
        ).toLocaleString()} -> ${new Date(exam.endTime).toLocaleString()}   |   ` +
            `Duration: ${exam.duration} min   |   Candidates: ${
                (exam.candidates || []).length
            }`,
        40,
        y
    );
    y += 13;
    doc.text(
        `Max score: ${maxScore} (MCQ ${mcqMax} + Coding ${codingMax})` +
            (exam.passingMarks != null ? `   |   Passing marks: ${exam.passingMarks}` : ""),
        40,
        y
    );
    y += 18;

    // Table header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    const cols = [40, 190, 270, 330, 395, 455];
    const headers = ["Candidate", "Submitted", "Auto", "Coding", "Total", "Susp/Viol"];
    headers.forEach((h, i) => doc.text(h, cols[i], y));
    y += 6;
    doc.setDrawColor(180);
    doc.line(40, y, 555, y);
    y += 12;

    doc.setFont("helvetica", "normal");

    if (users.length === 0) {
        doc.setTextColor(120);
        doc.text("No candidates assigned.", 40, y);
        y += 14;
    }

    users.forEach((u) => {
        if (y > 780) {
            doc.addPage();
            y = 50;
        }

        const sub = subByCand.get(String(u._id));
        const obtained = sub ? (sub.autoScore || 0) + (sub.codingMarks || 0) : null;

        const name = doc.splitTextToSize(`${u.name} <${u.email}>`, 145)[0];
        doc.setTextColor(30);
        doc.text(String(name), cols[0], y);
        const submittedLabel = sub
            ? sub.submittedAt
                ? new Date(sub.submittedAt).toISOString().slice(0, 10)
                : "yes"
            : "NOT SUBMITTED";
        doc.text(submittedLabel, cols[1], y);
        doc.text(sub ? `${sub.autoScore ?? 0}/${sub.totalMcqMarks ?? 0}` : "-", cols[2], y);
        doc.text(sub ? (sub.codingMarks != null ? `${sub.codingMarks}/${codingMax}` : "pending") : "-", cols[3], y);
        doc.text(obtained != null ? `${obtained}/${maxScore}` : "-", cols[4], y);
        doc.text(
            `${suspByCand.get(String(u._id)) ?? 0} / ${violByCand.get(String(u._id)) || 0}`,
            cols[5],
            y
        );
        y += 14;
    });

    return y + 12;
};

const exportReportPdf = async (req, res) => {
    try {
        const { examId } = req.query;

        let exams;
        if (examId) {
            if (!isObjectId(examId)) {
                return res.status(400).json({ message: "Invalid examId" });
            }
            const exam = await Exam.findById(examId).lean();
            if (!exam) {
                return res.status(404).json({ message: "Exam not found" });
            }
            exams = [exam];
        } else {
            exams = await Exam.find().select("title status startTime endTime duration candidates passingMarks").lean();
        }

        const doc = new jsPDF({ unit: "pt", format: "a4" });

        // Header
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.setTextColor(20);
        doc.text("Face Secure - Academic & Proctoring Report", 40, 50);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text(`Generated: ${new Date().toISOString()}`, 40, 66);
        doc.text(
            examId ? "Scope: single examination" : `Scope: all examinations (${exams.length})`,
            40,
            80
        );

        let y = 108;

        if (!examId) {
            // Overview table across exams
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            const cols = [40, 250, 320, 400, 470];
            ["Exam", "Status", "Assigned", "Violations", "Window"].forEach((h, i) =>
                doc.text(h, cols[i], y)
            );
            y += 6;
            doc.line(40, y, 555, y);
            y += 14;

            doc.setFont("helvetica", "normal");

            if (exams.length === 0) {
                doc.text("No exams found.", 40, y);
                y += 16;
            }

            for (const exam of exams) {
                if (y > 780) {
                    doc.addPage();
                    y = 50;
                }
                const violCount = await ViolationLog.countDocuments({ exam: exam._id });
                doc.setTextColor(30);
                doc.text(doc.splitTextToSize(String(exam.title), 200)[0], cols[0], y);
                doc.text(String(exam.status), cols[1], y);
                doc.text(String((exam.candidates || []).length), cols[2], y);
                doc.text(String(violCount), cols[3], y);
                doc.text(
                    `${new Date(exam.startTime).toLocaleDateString()} - ${new Date(
                        exam.endTime
                    ).toLocaleDateString()}`,
                    cols[4],
                    y
                );
                y += 15;
            }
            y += 14;
        }

        for (const exam of exams) {
            if (y > 600) {
                doc.addPage();
                y = 50;
            }
            y = await buildExamSection(doc, exam, y);
        }

        const buffer = Buffer.from(doc.output("arraybuffer"));

        const filename = examId
            ? `face-secure-exam-${examId}.pdf`
            : `face-secure-report-${Date.now()}.pdf`;

        res.set("Content-Type", "application/pdf");
        res.set("Content-Disposition", `attachment; filename="${filename}"`);
        res.status(200).send(buffer);
    } catch (error) {
        res.status(500).json({
            message: "Failed to generate PDF report",
            error: error.message
        });
    }
};

module.exports = { exportReportPdf };
