# Face Secure — Backend (Express + MongoDB)

REST API for the online examination & AI-based proctoring system.
All existing endpoints are stable; newer features were added **additively**
(new routes + optional schema fields only — no contract was changed).

- **Runtime:** Node.js 18+ · Express 5 · Mongoose 9 (MongoDB)
- **Auth:** JWT in an **HttpOnly cookie** (`jsonwebtoken` + `cookie-parser`), bcrypt password hashes
- **Reports:** `jspdf` (server-side PDF export)
- **Port:** `5000` (override with `PORT`)

---

## Setup

```bash
npm install
copy .env.example .env     # Windows (or: cp .env.example .env)
npm start                  # node server.js → http://localhost:5000
# optional hot-reload:
npx nodemon server.js
```

### Environment (`.env`)

| Key              | Example                                            | Required |
|------------------|----------------------------------------------------|----------|
| `PORT`           | `5000`                                             | yes |
| `NODE_ENV`       | `development`                                      | yes |
| `MONGO_URI`      | `mongodb://127.0.0.1:27017/smart-exam-proctoring`  | yes |
| `JWT_SECRET`     | long random string                                 | yes |
| `CLIENT_URL`     | `http://localhost:5173`                            | yes (CORS origin) |
| `ALLOWED_ORIGINS`| `https://a.onrender.com,https://b.onrender.com`     | no (extra CORS origins, comma-separated) |
| `GEMINI_API_KEY` | *(optional — summaries run locally, no key needed)* | no |

> **Deployment note:** unknown origins are no longer a hard error — they just receive no
> CORS headers (the browser blocks the read). Same-origin requests (e.g. the SPA served
> by this same app on Render) always work. When `frontend/dist` exists it is served by
> this app with an SPA fallback (`/api/*` still returns JSON 404s).

> ⚠️ Node module paths are case-sensitive across platforms — always require models as
> `../models/EventLog`, `../models/User`, `../models/Exam`, … (exact casing used everywhere).

---

## Folder structure

```
src/
├── app.js                 # express app: middleware, CORS, error handling, route mounts
├── config/db.js           # MongoDB connection
├── middleware/
│   ├── authMiddleware.js  # verifies JWT cookie → req.user = { id, role }
│   ├── roleMiddleware.js  # roleMiddleware("invigilator","admin") guard
│   ├── notFoundMiddleware.js
│   └── errorMiddleware.js
├── models/                # Mongoose schemas (see below)
├── controllers/           # one controller per resource
├── routes/                # one router per resource (mounted in app.js)
└── services/              # scoreService, eventService, summary helpers
```

---

## API reference

Roles: **public** = no auth · **auth** = any logged-in user · **cand** = candidate only ·
**inv/admin** = invigilator or admin.

### Auth — `/api/auth`

| Method | Path                | Role   | Description |
|--------|---------------------|--------|-------------|
| POST   | `/register`         | public | Create account (role `candidate` or `invigilator`) |
| POST   | `/login`            | public | Sets JWT HttpOnly cookie |
| POST   | `/logout`           | auth   | Clears cookie |
| GET    | `/me`               | auth   | Current user from cookie |
| PUT    | `/profile`          | auth   | Update `name` (email is immutable) |
| POST   | `/forgot-password`  | public | 30-min SHA-256-hashed token. **No SMTP** → in dev mode the response includes `devMode: true` + `devResetUrl`/`devToken` |
| POST   | `/reset-password`   | public | `{ token, password }` → single-use reset |

### Exams — `/api/exams`

| Method | Path                    | Role     | Description |
|--------|-------------------------|----------|-------------|
| GET    | `/`                     | auth     | List exams (`?status=`) |
| GET    | `/:id`                  | auth     | Exam detail (candidates populated) |
| POST   | `/`                     | inv/admin | Create exam. Optional fields: `instructions`, `totalMarks`, `passingMarks`, `requireCamera`, `allowMultipleFaces`, `candidates[]` |
| PUT    | `/:id`                  | inv/admin | Partial update incl. **candidate assignment** (`candidates` must be existing `candidate` accounts, else 400) |
| DELETE | `/:id`                  | inv/admin | Delete exam **+ cascade**: questions, submissions, scores, violations, events, summaries |
| PATCH  | `/:id/status`           | inv/admin | `upcoming` \| `active` \| `completed` |
| GET    | `/:id/results`          | inv/admin | Academic + proctoring report rows (per-candidate auto/coding/total, suspicion, violations) |

### Questions — `/api/exams/:examId/questions` (mounted on `/api/exams`)

| Method | Path                              | Role     | Description |
|--------|-----------------------------------|----------|-------------|
| GET    | `/:examId/questions`              | auth     | Candidates (assigned only) receive questions **with answers stripped**; inv/admin receive the full version |
| POST   | `/:examId/questions`              | inv/admin | Add question (`mcq` \| `coding`, marks, options/correctOption or starterCode) |
| DELETE | `/:examId/questions/:questionId`  | inv/admin | Remove question |

### Submissions & grading — (mounted on `/api/exams`)

| Method | Path                                            | Role     | Description |
|--------|-------------------------------------------------|----------|-------------|
| POST   | `/:examId/submit`                               | cand     | Submit answers — **MCQ auto-scored server-side** |
| GET    | `/:examId/my-result`                            | cand     | Own score |
| GET    | `/:examId/submissions`                          | inv/admin | All attempts for review |
| PATCH  | `/:examId/submissions/:submissionId/review`     | inv/admin | Score coding answers + feedback (updates submission + score) |

### Users — `/api/users`

| Method | Path             | Role     | Description |
|--------|------------------|----------|-------------|
| GET    | `/students`      | inv/admin | All `candidate` accounts with their assigned exams |
| GET    | `/:id/exams`     | inv/admin | One student's full exam history (auto score, coding marks, suspicion, violations) |

### Scores — `/api/scores`

| Method | Path                        | Role     | Description |
|--------|-----------------------------|----------|-------------|
| GET    | `/student/:studentId`       | inv/admin | Academic + integrity roll-up for one student (`{ results, totals }`) |
| GET    | `/:candidateId/:examId`     | inv/admin | Suspicion score for a candidate in an exam (404 when none exists — clients handle it) |

### Results / Analytics / Reports

| Method | Path            | Role     | Description |
|--------|-----------------|----------|-------------|
| GET    | `/api/results`  | inv/admin | Per-exam roll-up: sessions, auto/coding totals, suspicion, violations + summary |
| GET    | `/api/analytics`| inv/admin | `{ totals, eventsByType, violationsByType, suspicion }` |
| GET    | `/api/reports/pdf?examId=` | inv/admin | **jsPDF** A4 export. With `examId`: full report (window, per-candidate marks, pass/fail, proctoring counters). Without: summary table of all exams. Returns `application/pdf` |

### Face verification — `/api/face`

| Method | Path     | Role | Description |
|--------|----------|------|-------------|
| POST   | `/verify`| auth | `{ descriptorA[128], descriptorB[128], threshold? }` → `{ match, distance, threshold }`. **Descriptors only — never images.** Default threshold `0.55` (same cut-off the client uses) |

### Proctoring events & violations

| Method | Path           | Role     | Description |
|--------|----------------|----------|-------------|
| POST   | `/api/events`  | cand     | Camera/object detections (`MULTIPLE_FACES`, `NO_FACE`, `MOBILE_DETECTED`, …) |
| GET    | `/api/events`  | inv/admin | Query by candidate/exam |
| POST   | `/api/violations` | cand  | Screen-guard + identity violations (`TAB_SWITCH`, `COPY_PASTE`, `FULLSCREEN_EXIT`, `UNKNOWN_FACE`, …). Unknown faces carry weight 6 |
| GET    | `/api/violations`| inv/admin | Query by candidate/exam |

Suspicion scoring is computed server-side from the event/violation stream
(`SuspicionScore`), read by the live monitor.

### Summaries — `/api/summaries`

| Method | Path                                   | Role     | Description |
|--------|----------------------------------------|----------|-------------|
| POST   | `/generate/:candidateId/:examId`       | inv/admin | Generate **local rule-based** session summary (no external AI API) |
| GET    | `/:candidateId/:examId`                | inv/admin | Read stored summary |

### Study material — `/api/study` (candidate-only)

| Method | Path      | Role | Description |
|--------|-----------|------|-------------|
| POST   | `/upload` | cand | Upload study document |
| POST   | `/ask`    | cand | Ask question against study material |

---

## Data models

| Model            | Purpose |
|------------------|---------|
| `User`           | accounts (`role`: `candidate` \| `invigilator` \| `admin`), bcrypt hash |
| `Exam`           | schedule + rules. Optional: `instructions`, `totalMarks`, `passingMarks`, `requireCamera`, `allowMultipleFaces`, `candidates[]` |
| `Question`       | MCQ/coding question bank per exam (`order`, `marks`, options, correct answer / starter code) |
| `Submission`     | answers, `autoScore`, `totalMcqMarks`, `codingMarks`, review feedback |
| `ViolationLog`   | screen-guard + `UNKNOWN_FACE` violations |
| `EventLog`       | camera detections (faces, mobile) |
| `SuspicionScore` | per candidate/exam suspicion total |
| `AISummary`      | stored session summary (local algorithm) |
| `PasswordReset`  | hashed reset token + TTL index (30 min) |
| `StudyDocument`  | candidate study material |

---

## Policies

- **Invigilator conduct policy** — exam management endpoints (update / delete / status /
  results / questions / submissions grading) require role `invigilator` or `admin`.
  Creator-ownership is intentionally **not** enforced: any invigilator may conduct any exam
  by their own criteria. Candidates never pass the role guard.
- **Assignment validation** — `PUT /exams/:id { candidates }` only accepts ids of existing
  `candidate` accounts; stale/orphan references are rejected with `400`
  (the frontend filters them out and drops them on save).
- **Cascade delete** — deleting an exam removes its questions, submissions, scores,
  violations, events and summaries.
- **Answers never leave the server to candidates** — `GET questions` strips correct options
  for the `candidate` role; MCQ grading happens on submit, server-side.
- **PDF** — `GET /reports/pdf` streams a real `application/pdf` (`%PDF-` header), generated
  entirely offline with jsPDF.

---

## Smoke test

```bash
# login (save the Set-Cookie header)
curl -i -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"teacher@test.com","password":"teacher123"}'

# then reuse the cookie:
curl http://localhost:5000/api/analytics -H "Cookie: <jwt-cookie>"
curl "http://localhost:5000/api/reports/pdf" -H "Cookie: <jwt-cookie>" -o report.pdf
```
