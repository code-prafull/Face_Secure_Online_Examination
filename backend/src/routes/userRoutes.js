const express = require("express");

const { getStudents, getStudentExams } = require("../controllers/userController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

// Registered before /:id/exams so "students" is never read as a student id
router.get(
    "/students",
    authMiddleware,
    roleMiddleware("invigilator", "admin"),
    getStudents
);

router.get(
    "/:id/exams",
    authMiddleware,
    roleMiddleware("invigilator", "admin"),
    getStudentExams
);

module.exports = router;
