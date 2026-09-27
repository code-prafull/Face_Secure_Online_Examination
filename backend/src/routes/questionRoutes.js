const express = require("express");

const {
    createQuestion,
    getQuestions,
    deleteQuestion
} = require("../controllers/questionController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

// Exam-scoped question bank — mounted at /api/exams
router.post(
    "/:examId/questions",
    authMiddleware,
    roleMiddleware("invigilator", "admin"),
    createQuestion
);

router.get("/:examId/questions", authMiddleware, getQuestions);

router.delete(
    "/:examId/questions/:questionId",
    authMiddleware,
    roleMiddleware("invigilator", "admin"),
    deleteQuestion
);

module.exports = router;
