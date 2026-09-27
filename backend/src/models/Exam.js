const mongoose = require("mongoose");

const examSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true
        },

        description: {
            type: String,
            trim: true
        },

        duration: {
            type: Number,
            required: true
        },

        startTime: {
            type: Date,
            required: true
        },

        endTime: {
            type: Date,
            required: true
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        candidates: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            }
        ],

        status: {
            type: String,
            enum: ["upcoming", "active", "completed"],
            default: "upcoming"
        },

        // ---- additive optional fields (existing docs keep working) ----
        instructions: {
            type: String,
            trim: true
        },

        totalMarks: {
            type: Number,
            default: null
        },

        passingMarks: {
            type: Number,
            default: null
        },

        requireCamera: {
            type: Boolean,
            default: true
        },

        allowMultipleFaces: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Exam", examSchema);
