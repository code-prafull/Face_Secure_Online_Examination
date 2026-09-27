const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const authRoutes = require("./routes/authRoutes");
const examRoutes = require("./routes/examRoutes");
const eventRoutes = require("./routes/eventRoutes");
const scoreRoutes = require("./routes/scoreRoutes");
const summaryRoutes = require("./routes/summaryRoutes");
const studyRoutes = require("./routes/studyRoutes");
// Additive routes (new features — existing routes untouched)
const questionRoutes = require("./routes/questionRoutes");
const submissionRoutes = require("./routes/submissionRoutes");
const violationRoutes = require("./routes/violationRoutes");
// Additive routes — round 2 (missing endpoints)
const userRoutes = require("./routes/userRoutes");
const resultRoutes = require("./routes/resultRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const reportRoutes = require("./routes/reportRoutes");
const faceRoutes = require("./routes/faceRoutes");

const notFoundMiddleware = require("./middleware/notFoundMiddleware");
const errorMiddleware = require("./middleware/errorMiddleware");

const app = express();

const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174"
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
            return;
        }

        callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/exams", examRoutes);
// Additive mounts (new features — existing mounts untouched)
app.use("/api/exams", questionRoutes);
app.use("/api/exams", submissionRoutes);
app.use("/api/violations", violationRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/scores", scoreRoutes);
app.use("/api/summaries", summaryRoutes);
app.use("/api/study", studyRoutes);
// Additive mounts — round 2 (missing endpoints)
app.use("/api/users", userRoutes);
app.use("/api/results", resultRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/face", faceRoutes);

app.get("/", (req, res) => {
    res.json({
        message: "Smart Exam Proctoring System API"
    });
});

app.use(notFoundMiddleware);
app.use(errorMiddleware);

module.exports = app;
