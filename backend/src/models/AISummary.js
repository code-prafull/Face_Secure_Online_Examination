const mongoose = require("mongoose");

const aiSummarySchema = new mongoose.Schema(
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

        summary: {
            type: String,
            required: true
        },

        generatedBy: {
            type: String,
            default: "Gemini"
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("AISummary", aiSummarySchema);
