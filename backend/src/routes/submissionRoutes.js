const express = require("express");

const {
    submitExamAnswers,
    getMyResult,
    getExamSubmissions,
    reviewSubmission
} = require("../controllers/submissionController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

// Exam-scoped attempts & results — mounted at /api/exams
router.post("/:examId/submit", authMiddleware, roleMiddleware("candidate"), submitExamAnswers);

router.get("/:examId/my-result", authMiddleware, roleMiddleware("candidate"), getMyResult);

router.get(
    "/:examId/submissions",
    authMiddleware,
    roleMiddleware("invigilator", "admin"),
    getExamSubmissions
);

router.patch(
    "/:examId/submissions/:submissionId/review",
    authMiddleware,
    roleMiddleware("invigilator", "admin"),
    reviewSubmission
);

module.exports = router;
