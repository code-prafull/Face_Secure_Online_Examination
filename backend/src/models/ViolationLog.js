const mongoose = require("mongoose");

/**
 * Browser-side behavioural violations detected during a live exam:
 * tab switch / blur, copy-paste attempt, right-click, fullscreen exit,
 * and UNKNOWN_FACE (face in frame that does not match the reference face
 * captured at verification — identity mismatch).
 *
 * These live in their own log because the existing EventLog.eventType enum
 * is intentionally limited to camera/object detections (unchanged).
 * Each violation also increments the candidate's SuspicionScore so the
 * teacher's existing monitoring views reflect them immediately.
 *
 * NOTE: additive model — existing models are untouched.
 */
const violationLogSchema = new mongoose.Schema(
    {
        candidate: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        exam: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Exam",
            required: true,
            index: true
        },

        type: {
            type: String,
            enum: ["TAB_SWITCH", "COPY_PASTE", "RIGHT_CLICK", "FULLSCREEN_EXIT", "UNKNOWN_FACE"],
            required: true
        },

        details: {
            type: String,
            trim: true
        },

        timestamp: {
            type: Date,
            default: Date.now
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("ViolationLog", violationLogSchema);
