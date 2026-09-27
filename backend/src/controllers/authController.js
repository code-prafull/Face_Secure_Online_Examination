const User = require("../models/User");
const PasswordReset = require("../models/PasswordReset");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 24 * 60 * 60 * 1000
};

const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                message: "Name, email and password are required"
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                message: "Password must be at least 8 characters"
            });
        }

        const existingUser = await User.findOne({
            email: email.toLowerCase().trim()
        });

        if (existingUser) {
            return res.status(409).json({
                message: "Email already registered"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const user = await User.create({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            role: "candidate"
        });

        res.status(201).json({
            message: "Registration successful",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        res.status(500).json({
            message: "Registration failed",
            error: error.message
        });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        const user = await User.findOne({
            email: email.toLowerCase().trim()
        });

        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const isMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!isMatch) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const token = jwt.sign(
            {
                id: user._id,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1d"
            }
        );

        res.cookie("token", token, cookieOptions);

        res.status(200).json({
            message: "Login successful",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        res.status(500).json({
            message: "Login failed",
            error: error.message
        });
    }
};

const logout = (req, res) => {
    res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax"
    });

    res.status(200).json({
        message: "Logout successful"
    });
};

// Get currently authenticated user
const getMe = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      user: {
        id: req.user.id,
        role: req.user.role,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Unable to fetch user session",
    });
  }
};

// ---------------------------------------------------------------------------
// Additive endpoints (existing handlers above are untouched)
// ---------------------------------------------------------------------------

const hashResetToken = (token) =>
    crypto.createHash("sha256").update(token).digest("hex");

// POST /api/auth/forgot-password  { email }
// Generates a 30-minute reset token. This project has no SMTP provider, so
// no email is sent and none is claimed: in non-production the raw token/link
// is returned once, clearly flagged with devMode: true.
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email || typeof email !== "string" || !email.trim()) {
            return res.status(400).json({ message: "Email is required" });
        }

        const generic = {
            message:
                "If an account exists for that email, a password reset link has been generated."
        };

        const user = await User.findOne({
            email: email.toLowerCase().trim()
        });

        if (!user) {
            return res.status(200).json(generic);
        }

        // One active token per account
        await PasswordReset.deleteMany({ user: user._id, usedAt: null });

        const rawToken = crypto.randomBytes(32).toString("hex");

        await PasswordReset.create({
            user: user._id,
            tokenHash: hashResetToken(rawToken),
            expiresAt: new Date(Date.now() + 30 * 60 * 1000)
        });

        const payload = { ...generic, expiresInMinutes: 30 };

        if (process.env.NODE_ENV !== "production") {
            payload.devMode = true;
            payload.devResetToken = rawToken;
            payload.devResetUrl = `/reset-password?token=${rawToken}`;
        }

        return res.status(200).json(payload);
    } catch (error) {
        return res.status(500).json({
            message: "Failed to process password reset request",
            error: error.message
        });
    }
};

// POST /api/auth/reset-password  { token, password }
const resetPassword = async (req, res) => {
    try {
        const { token, password } = req.body;

        if (!token || typeof token !== "string") {
            return res.status(400).json({ message: "Reset token is required" });
        }

        if (!password || password.length < 8) {
            return res.status(400).json({
                message: "Password must be at least 8 characters"
            });
        }

        const record = await PasswordReset.findOne({
            tokenHash: hashResetToken(token),
            usedAt: null
        });

        if (!record || record.expiresAt.getTime() < Date.now()) {
            return res.status(400).json({
                message: "Reset link is invalid or has expired. Request a new one."
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        await User.findByIdAndUpdate(record.user, { password: hashedPassword });

        record.usedAt = new Date();
        await record.save();

        res.status(200).json({
            message: "Password updated successfully. You can sign in now."
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to reset password",
            error: error.message
        });
    }
};

// PUT /api/auth/profile  { name }  (authenticated)
const updateProfile = async (req, res) => {
    try {
        const { name } = req.body;

        if (!name || typeof name !== "string" || !name.trim()) {
            return res.status(400).json({ message: "Name is required" });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        user.name = name.trim();
        await user.save();

        res.status(200).json({
            message: "Profile updated successfully",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to update profile",
            error: error.message
        });
    }
};

module.exports = {
    register,
    login,
    logout,
    getMe,
    forgotPassword,
    resetPassword,
    updateProfile
};
