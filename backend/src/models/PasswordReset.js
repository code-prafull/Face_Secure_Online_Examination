const mongoose = require("mongoose");

/**
 * Password-reset tokens (additive model — existing models untouched).
 *
 * Only the SHA-256 hash of the raw token is stored. The raw token is
 * returned exactly once in the dev-mode response of POST /api/auth/forgot-password,
 * because this project has no SMTP provider configured — nothing is faked:
 * no "email sent" claim is ever made.
 */
const passwordResetSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        tokenHash: {
            type: String,
            required: true,
            unique: true
        },

        expiresAt: {
            type: Date,
            required: true
        },

        usedAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

// Mongo removes the document the moment it expires (token then simply
// fails to match → "invalid or expired").
passwordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("PasswordReset", passwordResetSchema);
