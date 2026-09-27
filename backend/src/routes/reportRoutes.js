const express = require("express");

const { exportReportPdf } = require("../controllers/reportController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.get(
    "/pdf",
    authMiddleware,
    roleMiddleware("invigilator", "admin"),
    exportReportPdf
);

module.exports = router;
