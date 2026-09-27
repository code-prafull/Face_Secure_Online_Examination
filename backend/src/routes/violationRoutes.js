const express = require("express");

const {
    createViolation,
    getViolations
} = require("../controllers/violationController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.post("/", authMiddleware, roleMiddleware("candidate"), createViolation);

router.get(
    "/",
    authMiddleware,
    roleMiddleware("invigilator", "admin"),
    getViolations
);

module.exports = router;
