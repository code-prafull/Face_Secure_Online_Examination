const mongoose = require("mongoose");

/**
 * Question bank for an exam. Supports two types:
 *  - mcq:    multiple choice with server-held correct answer (auto-graded)
 *  - coding: free-form code answer reviewed by the invigilator
 *            (interview-style manual review, no external judge/API)
 *
 * NOTE: additive model — existing models are untouched.
 */
const questionSchema = new mongoose.Schema(
    {
        exam: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Exam",
            required: true,
            index: true
        },

        type: {
            type: String,
            enum: ["mcq", "coding"],
            default: "mcq"
        },

        questionText: {
            type: String,
            required: true,
            trim: true
        },

        // MCQ options: [{ id: "a", text: "..." }]
        options: [
            {
                _id: false,
                id: { type: String, required: true },
                text: { type: String, required: true }
            }
        ],

        // MCQ correct option id — never sent to candidates
        correctOption: {
            type: String
        },

        marks: {
            type: Number,
            default: 1,
            min: 0
        },

        // Coding question fields
        language: {
            type: String,
            default: "javascript"
        },

        starterCode: {
            type: String,
            default: ""
        },

        // Guidance for manual review (no automated code execution)
        expectedApproach: {
            type: String,
            trim: true
        },

        order: {
            type: Number,
            default: 0
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Question", questionSchema);
