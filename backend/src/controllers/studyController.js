const StudyDocument = require("../models/StudyDocument");

const uploadStudyMaterial = async (req, res) => {
    try {
        const { fileName, fileUrl } = req.body;

        if (!fileName || !fileUrl) {
            return res.status(400).json({
                message: "File name and file URL are required"
            });
        }

        const document = await StudyDocument.create({
            uploadedBy: req.user.id,
            fileName,
            fileUrl,
            chunks: []
        });

        res.status(201).json({
            message: "Study material uploaded successfully",
            document
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to upload study material",
            error: error.message
        });
    }
};

const askStudyAssistant = async (req, res) => {
    try {
        const { question, documentId } = req.body;

        if (!question || !documentId) {
            return res.status(400).json({
                message: "Question and document ID are required"
            });
        }

        const document = await StudyDocument.findOne({
            _id: documentId,
            uploadedBy: req.user.id
        });

        if (!document) {
            return res.status(404).json({
                message: "Study material not found"
            });
        }

        res.status(200).json({
            message: "Study assistant endpoint is ready",
            question,
            documentId,
            note: "RAG retrieval and Gemini response will be implemented next."
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to process question",
            error: error.message
        });
    }
};

module.exports = {
    uploadStudyMaterial,
    askStudyAssistant
};
