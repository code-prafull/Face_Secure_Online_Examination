const express = require("express");

const { getAnalytics } = require("../controllers/analyticsController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.get(
    "/",
    authMiddleware,
    roleMiddleware("invigilator", "admin"),
    getAnalytics
);

module.exports = router;
