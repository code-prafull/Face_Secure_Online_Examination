const mongoose = require("mongoose");

const eventLogSchema = new mongoose.Schema(
    {
        candidate: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        exam: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Exam",
            required: true
        },

        eventType: {
            type: String,
            enum: [
                "NO_FACE",
                "MULTIPLE_FACES",
                "MOBILE_DETECTED",
                "BOOK_DETECTED"
            ],
            required: true
        },

        timestamp: {
            type: Date,
            default: Date.now
        },

        details: {
            type: String,
            trim: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("EventLog", eventLogSchema);
