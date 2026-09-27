const express = require("express");

const {
    getScore,
    getStudentResults
} = require("../controllers/scoreController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

// NOTE: /student/:studentId must be registered BEFORE /:candidateId/:examId,
// otherwise "student" would be parsed as a candidate id.
router.get(
    "/student/:studentId",
    authMiddleware,
    roleMiddleware("invigilator", "admin"),
    getStudentResults
);

router.get(
    "/:candidateId/:examId",
    authMiddleware,
    roleMiddleware("invigilator", "admin"),
    getScore
);

module.exports = router;
