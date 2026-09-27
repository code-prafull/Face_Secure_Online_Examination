const express = require("express");

const { verifyFace } = require("../controllers/faceController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post(
    "/verify",
    authMiddleware,
    verifyFace
);

module.exports = router;
