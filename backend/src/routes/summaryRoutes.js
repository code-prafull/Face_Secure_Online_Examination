const express = require("express");

const {
    generateSummary,
    getSummary
} = require("../controllers/summaryController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.post(
    "/generate/:candidateId/:examId",
    authMiddleware,
    roleMiddleware("invigilator", "admin"),
    generateSummary
);

router.get(
    "/:candidateId/:examId",
    authMiddleware,
    roleMiddleware("invigilator", "admin"),
    getSummary
);

module.exports = router;
