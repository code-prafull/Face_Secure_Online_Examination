const express = require("express");
const router = express.Router();

const {
  register,
  login,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
  updateProfile,
} = require("../controllers/authController");

const authMiddleware = require("../middleware/authMiddleware");

// Public routes
router.post("/register", register);
router.post("/login", login);

// Additive auth endpoints (existing routes untouched)
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// Protected routes
router.post("/logout", logout);
router.get("/me", authMiddleware, getMe);
router.put("/profile", authMiddleware, updateProfile);

module.exports = router;
