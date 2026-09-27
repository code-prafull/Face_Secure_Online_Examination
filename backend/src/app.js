const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
const fs = require("fs");

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

// Render (and most PaaS platforms) sit behind a reverse proxy —
// trust X-Forwarded-* headers so protocol/secure-cookie handling is correct.
app.set("trust proxy", 1);

const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    // Production frontend origin — only needed when the SPA is hosted
    // separately (e.g. a Render static site). Same-origin single-service
    // deploys don't require it, but setting CLIENT_URL is harmless.
    process.env.CLIENT_URL,
    // Optional extra origins (comma-separated):
    // ALLOWED_ORIGINS=https://a.onrender.com,https://b.onrender.com
    ...((process.env.ALLOWED_ORIGINS || "")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean)),
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // No Origin header (same-origin GETs, curl, server-to-server) → allow.
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
            return;
        }

        // Unknown origin → simply omit CORS headers (the browser then blocks
        // cross-origin reads). Never throw: a same-origin SPA posting to its
        // own API must not be rejected with a 500.
        callback(null, false);
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

// --- Serve the built frontend (Render single-service deployment: API + SPA on one origin) ---
// distDir = <repo>/frontend/dist  (relative to backend/src/app.js)
const distDir = path.join(__dirname, "..", "..", "frontend", "dist");
const indexHtml = path.join(distDir, "index.html");
const hasFrontend = fs.existsSync(indexHtml);

if (hasFrontend) {
    // Static assets; "/" resolves to dist/index.html (checked before the API info route).
    app.use(express.static(distDir));
}

app.get("/", (req, res) => {
    // Reached only when the frontend hasn't been built (API-only mode).
    res.json({
        message: "Smart Exam Proctoring System API"
    });
});

if (hasFrontend) {
    // SPA fallback: client routes (/login, /candidate, …) return index.html.
    // /api/* falls through to the JSON 404 handler below.
    app.use((req, res, next) => {
        if (req.method !== "GET" || req.path.startsWith("/api")) {
            next();
            return;
        }

        res.sendFile(indexHtml);
    });
}

app.use(notFoundMiddleware);
app.use(errorMiddleware);

module.exports = app;
