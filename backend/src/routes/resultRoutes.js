const express = require("express");

const { getResults } = require("../controllers/resultController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.get(
    "/",
    authMiddleware,
    roleMiddleware("invigilator", "admin"),
    getResults
);

module.exports = router;
