const express = require("express");

const {
    createExam,
    getExams,
    getExamById,
    updateExam,
    deleteExam,
    updateExamStatus,
    getExamResults
} = require("../controllers/examController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.get(
    "/",
    authMiddleware,
    getExams
);

router.get(
    "/:id",
    authMiddleware,
    getExamById
);

router.post(
    "/",
    authMiddleware,
    roleMiddleware("invigilator", "admin"),
    createExam
);

// Additive endpoints (existing routes untouched)
router.put(
    "/:id",
    authMiddleware,
    roleMiddleware("invigilator", "admin"),
    updateExam
);

router.delete(
    "/:id",
    authMiddleware,
    roleMiddleware("invigilator", "admin"),
    deleteExam
);

router.patch(
    "/:id/status",
    authMiddleware,
    roleMiddleware("invigilator", "admin"),
    updateExamStatus
);

router.get(
    "/:id/results",
    authMiddleware,
    roleMiddleware("invigilator", "admin"),
    getExamResults
);

module.exports = router;
