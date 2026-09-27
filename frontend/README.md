# Face Secure — Frontend (React + Vite)

Client for the online examination & AI-based proctoring system: role-based dashboards,
a 3-step proctored exam flow (instructions → face lock → exam), live invigilation views,
and a dark-first aesthetic UI with a light/dark toggle.

- **Stack:** React 19 · Vite · Tailwind CSS v4 · React Router 7 · Axios · Recharts · sonner · react-icons
- **ML (100 % on-device):** `@vladmandic/face-api` (identity lock), `@tensorflow-models/coco-ssd` (mobile/object detection)
- **Dev server:** `5173` · **API:** `VITE_API_URL` (default `http://localhost:5000/api`, HttpOnly-cookie auth)

---

## Setup

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build → dist/
npm run preview    # preview the production build
npm run lint       # oxlint
```

> Backend must be running on `:5000` (see [../backend/README.md](../backend/README.md)).
> To point elsewhere, add `frontend/.env` → `VITE_API_URL=http://host:port/api`.
> There is **no dev-proxy** — axios calls the API origin directly (CORS allows `CLIENT_URL`).

---

## Project structure

```
src/
├── main.jsx / App.jsx        # router + providers + sonner Toaster (dark-styled)
├── index.css                 # Tailwind v4 + unlayered dark-skin layer (see Theme)
├── context/
│   └── AuthContext.jsx       # user state, login/register/logout/updateProfile,
│                             # 401 → /login, role-based redirect, profile cache
├── routes/
│   └── ProtectedRoute.jsx    # role-guarded routes (candidate / invigilator / admin)
├── services/                 # axios layer (all calls use withCredentials)
│   ├── api.js                # baseURL + interceptor (401 → /login, normalized messages)
│   ├── authService.js        # login, register, me, forgot/reset password, profile
│   ├── examService.js        # exams CRUD, status, results, questions, submit, my-result
│   ├── studentService.js     # GET /users/students, /users/:id/exams, /scores/student/:id
│   ├── resultService.js      # GET /results, /analytics, PDF download (blob)
│   └── proctoringService.js  # events, violations, suspicion, summaries
├── hooks/
│   ├── useProctoring.js      # detection loop: face identity lock + coco-ssd + screen guards,
│   │                         # interrupt dispatch (15 s cooldown), event/violation sync
│   └── useExamGuard.js       # timer, fullscreen enforcement, exit protection
├── components/
│   ├── layout/               # DashboardLayout, Sidebar, ThemeToggle
│   ├── common/               # PageHeader, Modal, StatCard, StatusBadge, skeletons,
│   │                         # EmptyState, ErrorMessage, LoadingSpinner…
│   ├── exam/                 # CodeEditor, question renderers
│   └── proctoring/           # FaceMonitor (camera HUD), InterruptOverlay (instant alerts)
└── pages/
    ├── auth/                 # Login, Register, ForgotPassword, ResetPassword
    ├── candidate/            # StudentDashboard, ExamList, ExamFlow (3 steps),
    │                         # StudentResults, StudentProfile, history…
    └── teacher/              # TeacherDashboard, MyExams, CreateExam, ManageQuestions,
                              # LiveMonitoring, ExamMonitor, Results, Students, Reports, Profile
```

---

## Routing

| Area | Paths | Guard |
|------|-------|-------|
| Public | `/login` `/register` `/forgot-password` `/reset-password` | redirect to role dashboard if already authed |
| Candidate | `/candidate` `/candidate/exams` `/exam/:examId` `/candidate/results` `/candidate/history` `/candidate/profile` | `ProtectedRoute roles=["candidate"]` |
| Invigilator / Admin | `/invigilator` `/invigilator/exams` `/create-exam` `/students` `/monitoring` `/monitoring/:examId` `/exams/:id/questions` `/results` `/reports` `/profile` | `ProtectedRoute roles=["invigilator","admin"]` |
| Misc | `/unauthorized`, `*` (404), `/admin` → `/invigilator` | — |

Navigation is role-aware via `AuthContext.getDashboardPath()`; expired sessions (401) redirect
to `/login` automatically.

---

## Exam flow (candidate, 3 steps)

1. **Instructions & consent** — schedule, rules, camera/fullscreen acknowledgement
   (exam may require `requireCamera` / disallow `allowMultipleFaces` per exam settings).
2. **Face verification (identity lock)** — grant camera → *Lock My Face* captures a reference
   descriptor; every detection cycle compares on-device (`euclideanDistance ≤ 0.55`).
   A mismatch raises an `UNKNOWN_FACE` interrupt **instantly** (candidate overlay + invigilator
   alert). Only numeric descriptors ever leave the device (optional `POST /api/face/verify`).
3. **Proctored exam** — MCQ + coding (CodeEditor), countdown, fullscreen. Violations:
   `TAB_SWITCH`, `COPY_PASTE`, `FULLSCREEN_EXIT`, plus camera detections
   `MULTIPLE_FACES`, `NO_FACE`, `MOBILE_DETECTED`. Every incident → instant
   `InterruptOverlay` (15 s cooldown) + `POST /api/violations|events`.

The invigilator side (`/invigilator/monitoring/:examId`) merges both streams into a 5 s
auto-refresh timeline with suspicion badges and a **local rule-based session summary**
(deterministic — no external AI API key).

---

## Theme (dark-first)

- `html.dark` is set **before first paint** by an inline script in `index.html` (default: dark).
- `src/index.css` keeps a single **unlayered dark-skin layer**: light utilities are remapped
  to dark equivalents (surfaces, text, borders, button gradients, glass sidebar/topbar,
  shadows, scrollbars, Recharts). No `dark:` sprinkle needed.
- `ThemeToggle` (topbar + auth pages) flips the class, persists `localStorage.theme`, and
  adds `theme-anim` for a ~450 ms cross-fade — only on real toggles in a visible tab.

---

## Testing helpers (fake camera)

For automated/self-testing without a real webcam:

```js
// in the browser console before starting the exam:
window.__faceMode = 'a'      // show test face amy1.png
window.__faceMode = 'b'      // show test face leonard1.png
window.__faceMode = 'two'    // two faces → MULTIPLE_FACES interrupt
window.__faceMode = 'none'   // no face → NO_FACE interrupt
```

Reference images live in `public/test-faces/` (`amy1.png`, `leonard1.png`), served with the
face-api model weights from `public/models/`.

---

## Conventions & gotchas

- Services never fabricate success: every button calls a real endpoint; missing backend
  features would surface as explicit toasts (none are pending — the API is complete).
- Errors are normalized by the axios interceptor to `{ message, status }`.
- `console.warn` only for non-fatal sync failures (violation retry, camera recovery).
- 404 on `GET /api/scores/:candidateId/:examId` for incident-free candidates is **expected**
  and handled (empty state), not an error.
- Never write into `public/` while `npm run dev` is running (Vite watch → EBUSY on Windows).
- Icons come from `react-icons/fi`; toasts from `sonner`.
