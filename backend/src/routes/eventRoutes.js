const express = require("express");

const {
    createEvent,
    getEvents
} = require("../controllers/eventController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.post(
    "/",
    authMiddleware,
    roleMiddleware("candidate"),
    createEvent
);

router.get(
    "/",
    authMiddleware,
    roleMiddleware("invigilator", "admin"),
    getEvents
);

module.exports = router;
