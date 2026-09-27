const mongoose = require("mongoose");

const studyDocumentSchema = new mongoose.Schema(
    {
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        fileName: {
            type: String,
            required: true
        },

        fileUrl: {
            type: String,
            required: true
        },

        chunks: [
            {
                text: {
                    type: String,
                    required: true
                },

                embedding: {
                    type: [Number]
                }
            }
        ]
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("StudyDocument", studyDocumentSchema);
