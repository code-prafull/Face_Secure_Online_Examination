const express = require("express");

const {
    uploadStudyMaterial,
    askStudyAssistant
} = require("../controllers/studyController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.post(
    "/upload",
    authMiddleware,
    roleMiddleware("candidate"),
    uploadStudyMaterial
);

router.post(
    "/ask",
    authMiddleware,
    roleMiddleware("candidate"),
    askStudyAssistant
);

module.exports = router;
