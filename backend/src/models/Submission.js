const mongoose = require("mongoose");

/**
 * One exam attempt per candidate.
 *  - autoScore:  MCQ marks computed server-side at submit time
 *  - codingMarks + feedback: set by the invigilator during review
 *    (interview-style: teacher reads the submitted code and scores it)
 *
 * NOTE: additive model — existing models are untouched.
 */
const submissionSchema = new mongoose.Schema(
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

        answers: [
            {
                _id: false,
                question: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Question"
                },
                selectedOption: {
                    type: String
                },
                code: {
                    type: String
                },
                language: {
                    type: String
                }
            }
        ],

        autoScore: {
            type: Number,
            default: 0,
            min: 0
        },

        totalMcqMarks: {
            type: Number,
            default: 0
        },

        codingMarks: {
            type: Number,
            default: null
        },

        feedback: {
            type: String,
            trim: true
        },

        status: {
            type: String,
            enum: ["submitted", "reviewed"],
            default: "submitted"
        },

        submittedAt: {
            type: Date,
            default: Date.now
        }
    },
    {
        timestamps: true
    }
);

// One attempt per candidate per exam
submissionSchema.index({ candidate: 1, exam: 1 }, { unique: true });

module.exports = mongoose.model("Submission", submissionSchema);
