import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  FiCheckSquare,
  FiSquare,
  FiArrowRight,
  FiArrowLeft,
  FiClock,
  FiFlag,
  FiSend,
  FiVideo,
  FiShield,
  FiAlertTriangle,
} from "react-icons/fi";
import { toast } from "sonner";
import { getExamById, getExamQuestions, submitExam } from "../../services/examService";
import { sendViolation } from "../../services/proctoringService";
import ProctoringPanel from "../../components/proctoring/ProctoringPanel";
import InterruptOverlay from "../../components/exam/InterruptOverlay";
import CodeEditor from "../../components/exam/CodeEditor";
import useExamGuard from "../../hooks/useExamGuard";
import ErrorMessage from "../../components/common/ErrorMessage";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { formatTime, formatDateTime } from "../../utils/formatters";

// Backend POST /api/violations cooldowns (seconds-level spam protection)
const VIOLATION_COOLDOWN_MS = {
  TAB_SWITCH: 10000,
  COPY_PASTE: 8000,
  RIGHT_CLICK: 8000,
  FULLSCREEN_EXIT: 15000,
};

const INCIDENT_LABELS = {
  MULTIPLE_FACES: "Extra faces",
  MOBILE_DETECTED: "Mobile phone",
  NO_FACE: "Face missing",
  UNKNOWN_FACE: "Unknown person",
  TAB_SWITCH: "Tab switch",
  COPY_PASTE: "Copy/paste",
  RIGHT_CLICK: "Right-click",
  FULLSCREEN_EXIT: "Fullscreen exit",
};

/**
 * Full student exam flow:
 *   Step 1 — Instructions + confirmation checkbox
 *   Step 2 — Camera permission + face verification readiness
 *   Step 3 — Live exam: timer, question nav, coding editor, proctoring
 *            with instant full-screen interrupts, behaviour guard,
 *            fullscreen and real backend submission
 */
function ExamFlow() {
  const { examId } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [step, setStep] = useState(1); // 1 instructions | 2 verify | 3 exam
  const [instructionsAccepted, setInstructionsAccepted] = useState(false);
  const [cameraGranted, setCameraGranted] = useState(false);
  const [cameraChecking, setCameraChecking] = useState(false);

  // Identity lock — candidate's reference face descriptor captured at
  // verification (Step 2) and compared against every face in frame during
  // the exam (UNKNOWN_FACE interrupt + backend violation on mismatch).
  const [referenceFace, setReferenceFace] = useState(null); // number[] | null
  const [faceCapturing, setFaceCapturing] = useState(false);
  const faceApiRef = useRef(null); // { captureReference } exposed by panel

  // Exam state
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({}); // mcq: optionId | coding: {code, language}
  const [marked, setMarked] = useState({});
  const [visited, setVisited] = useState({ 0: true });
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [showSubmit, setShowSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null); // backend response
  const autoSubmittedRef = useRef(false);

  // Interrupt queue — one full-screen overlay at a time
  const [interrupts, setInterrupts] = useState([]);
  const [incidentCounts, setIncidentCounts] = useState({});
  const violationLastSentRef = useRef({});

  const activeInterrupt = interrupts[0] || null;

  // Latest submit handler ref — the timer interval must always call the
  // freshest closure (with current answers), not the one from first render.
  const submitRef = useRef(null);

  // ---- Load exam + question paper ----
  useEffect(() => {
    const load = async () => {
      try {
        const data = await getExamById(examId);
        const examObj = data.exam || data;
        setExam(examObj);
        setSecondsLeft((examObj.duration || 0) * 60);

        try {
          const qData = await getExamQuestions(examId);
          setQuestions(qData.questions || []);
        } catch {
          // Older backend without questions route — paper stays empty and
          // the UI shows the marked "not available" placeholder.
          setQuestions([]);
        }
      } catch (err) {
        setError(err?.message || "Unable to load exam.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [examId]);

  // ---- Interrupt helpers ----
  const enqueueInterrupt = useCallback((interrupt) => {
    setInterrupts((prev) => [...prev, { ...interrupt, id: interrupt.id || Date.now() + Math.random() }]);
    setIncidentCounts((prev) => ({
      ...prev,
      [interrupt.kind]: (prev[interrupt.kind] || 0) + 1,
    }));
  }, []);

  const acknowledgeInterrupt = useCallback(() => {
    setInterrupts((prev) => prev.slice(1));
  }, []);

  // Camera/object detections forwarded from the proctoring panel
  const handleDetectionInterrupt = useCallback(
    (interrupt) => enqueueInterrupt(interrupt),
    [enqueueInterrupt]
  );

  // ---- Behaviour guard (tab switch, copy/paste, right-click, fullscreen) ----
  const handleViolation = useCallback(
    ({ type, details }) => {
      enqueueInterrupt({ kind: type, details });

      // Report to backend with per-type cooldown
      if (!examId) return;
      const now = Date.now();
      const cooldown = VIOLATION_COOLDOWN_MS[type] ?? 10000;
      if (now - (violationLastSentRef.current[type] || 0) < cooldown) return;
      violationLastSentRef.current[type] = now;

      sendViolation({ exam: examId, type, details }).catch((err) => {
        console.warn("Violation sync failed:", err?.message);
      });
    },
    [examId, enqueueInterrupt]
  );

  useExamGuard(step === 3 && !submitResult, handleViolation);

  // ---- Countdown timer ----
  useEffect(() => {
    if (step !== 3 || submitResult) return;
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(id);
          if (!autoSubmittedRef.current) {
            autoSubmittedRef.current = true;
            toast.warning("Time is up — submitting your exam.");
            submitRef.current?.(true);
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, submitResult]);

  // Track visited questions
  useEffect(() => {
    if (step === 3) setVisited((v) => ({ ...v, [current]: true }));
  }, [current, step]);

  const checkCamera = async () => {
    setCameraChecking(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      stream.getTracks().forEach((t) => t.stop());
      setCameraGranted(true);
      toast.success("Camera access granted.");
    } catch {
      setCameraGranted(false);
      toast.error("Camera permission denied. Allow camera access to continue.");
    } finally {
      setCameraChecking(false);
    }
  };

  const startExam = () => {
    if (!cameraGranted) {
      toast.error("Camera permission is required to start the exam.");
      return;
    }
    if (!referenceFace) {
      toast.warning(
        "Face lock was not captured — identity matching will stay off for this exam."
      );
    }
    setStep(3);
    // Interview-style: force fullscreen for the monitored session
    try {
      const el = document.documentElement;
      if (el.requestFullscreen && !document.fullscreenElement) {
        el.requestFullscreen().catch(() => {
          /* browser may refuse (permissions/automation) — exam still runs */
        });
      }
    } catch {
      /* non-fatal */
    }
    toast.success("Exam started — proctoring and screen guards are active.");
  };

  // ---- Identity lock: capture the candidate's reference face ----
  const captureFace = useCallback(async (silent = false) => {
    const api = faceApiRef.current;
    if (!api?.captureReference) {
      if (!silent) toast.error("Camera is still starting — try again in a moment.");
      return;
    }
    setFaceCapturing(true);
    try {
      const descriptor = await api.captureReference();
      if (descriptor) {
        setReferenceFace(descriptor);
        if (!silent) {
          toast.success("Face locked — any other person in frame will trigger an instant alert.");
        }
      } else if (!silent) {
        toast.error("No face detected — sit facing the camera and try again.");
      }
    } finally {
      setFaceCapturing(false);
    }
  }, []);

  // Auto-attempt the capture while the verification preview is up so most
  // candidates are locked in without pressing anything.
  useEffect(() => {
    if (step !== 2 || !cameraGranted || referenceFace) return;
    let tries = 0;
    const id = setInterval(() => {
      tries += 1;
      if (tries > 6) {
        clearInterval(id);
        return;
      }
      captureFace(true);
    }, 3000);
    return () => clearInterval(id);
  }, [step, cameraGranted, referenceFace, captureFace]);

  // ---- Answer handling ----
  const selectAnswer = (questionId, optionId) => {
    setAnswers((a) => ({ ...a, [questionId]: optionId }));
  };

  const updateCode = (questionId, code, language) => {
    setAnswers((a) => {
      const prev = a[questionId] || {};
      return {
        ...a,
        [questionId]: {
          code,
          language: language || prev.language || "javascript",
        },
      };
    });
  };

  const toggleMark = () => {
    const q = questions[current];
    if (!q) return;
    setMarked((m) => ({ ...m, [q._id]: !m[q._id] }));
  };

  const goTo = (index) => {
    if (index >= 0 && index < questions.length) setCurrent(index);
  };

  const isQuestionAnswered = (q) => {
    if (!q) return false;
    if (q.type === "coding") {
      const entry = answers[q._id];
      return Boolean(entry && entry.code && entry.code.trim());
    }
    return Boolean(answers[q._id]);
  };

  // ---- Submission (real backend endpoint) ----
  const handleFinalSubmit = useCallback(
    async (auto = false) => {
      setSubmitting(true);
      try {
        const payload = questions.map((q) => {
          if (q.type === "coding") {
            const entry = answers[q._id] || {};
            return {
              question: q._id,
              code: entry.code || "",
              language: entry.language || q.language || "javascript",
            };
          }
          return { question: q._id, selectedOption: answers[q._id] || null };
        });

        const result = await submitExam(examId, payload);
        setSubmitResult(result);
        toast.success(
          auto ? "Time expired — exam submitted." : "Exam submitted successfully."
        );
      } catch (err) {
        const msg = err?.message || "Submission failed.";
        toast.error(msg);
        // Keep the exam open so the candidate can retry
        autoSubmittedRef.current = false;
      } finally {
        setSubmitting(false);
        setShowSubmit(false);
      }
    },
    [examId, answers, questions]
  );

  // Keep the ref pointed at the current submit closure
  submitRef.current = handleFinalSubmit;

  // ---- Status counts ----
  const status = useMemo(() => {
    const s = { answered: 0, notAnswered: 0, marked: 0, notVisited: 0 };
    questions.forEach((q, i) => {
      if (marked[q._id]) s.marked++;
      else if (isQuestionAnswered(q)) s.answered++;
      else if (visited[i]) s.notAnswered++;
      else s.notVisited++;
    });
    return s;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions, answers, marked, visited]);

  const codingPending = questions.some((q) => q.type === "coding");
  const totalIncidents = Object.values(incidentCounts).reduce((a, b) => a + b, 0);

  if (loading) return <LoadingSpinner label="Loading examination..." />;
  if (error)
    return (
      <div className="p-6">
        <ErrorMessage message={error} onRetry={() => navigate("/candidate")} />
      </div>
    );
  if (!exam) return null;

  // ================= SUBMITTED RESULT =================
  if (submitResult) {
    const sub = submitResult.submission || {};
    const mcqGiven = (sub.totalMcqMarks || 0) > 0;
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
            <FiCheckSquare className="h-7 w-7 text-green-600" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-slate-800">Exam Submitted</h1>
          <p className="mt-2 text-sm text-slate-500">
            Your attempt for <strong>{exam.title}</strong> was recorded at{" "}
            {new Date(sub.submittedAt || Date.now()).toLocaleTimeString()}.
          </p>

          {mcqGiven && (
            <div className="mt-5 rounded-xl bg-blue-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-blue-500">
                Auto-graded score
              </p>
              <p className="mt-1 text-3xl font-bold text-blue-700">
                {sub.autoScore}
                <span className="text-base font-semibold text-blue-400">
                  {" "}/ {sub.totalMcqMarks}
                </span>
              </p>
            </div>
          )}

          {codingPending && (
            <div className="mt-3 rounded-xl bg-amber-50 p-4 text-xs leading-5 text-amber-800">
              Your coding answers were sent to your teacher for review. Final
              score appears in Results once reviewed.
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={() => navigate("/candidate/results")}
              className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              View Results
            </button>
            <button
              type="button"
              onClick={() => navigate("/candidate")}
              className="flex-1 rounded-lg border border-slate-300 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ================= STEP 1 — INSTRUCTIONS =================
  if (step === 1) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-8">
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                  Step 1 of 3 — Instructions
                </span>
                <h1 className="mt-3 text-2xl font-bold text-slate-800">{exam.title}</h1>
                {exam.description && (
                  <p className="mt-2 text-sm leading-6 text-slate-600">{exam.description}</p>
                )}
              </div>
            </div>

            {/* Exam details */}
            <dl className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-4">
                <dt className="text-xs font-medium text-slate-500">Duration</dt>
                <dd className="mt-1 flex items-center gap-1.5 text-lg font-bold text-slate-800">
                  <FiClock className="h-4 w-4 text-blue-600" />
                  {exam.duration} minutes
                </dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <dt className="text-xs font-medium text-slate-500">Starts</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-800">
                  {formatDateTime(exam.startTime)}
                </dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <dt className="text-xs font-medium text-slate-500">Status</dt>
                <dd className="mt-1 text-sm font-semibold capitalize text-slate-800">
                  {exam.status}
                </dd>
              </div>
            </dl>

            {/* Rules */}
            <div className="mt-6">
              <h2 className="text-base font-semibold text-slate-800">Examination Rules</h2>
              <ul className="mt-3 space-y-2.5 text-sm leading-6 text-slate-700">
                {[
                  "Only ONE person must be visible in the camera frame at all times.",
                  "Mobile phones, books and notes must NOT be visible in the camera — they are auto-detected.",
                  "Leaving the exam tab/window triggers an instant on-screen alert and is recorded.",
                  "Copy, paste and right-click are disabled and any attempt is recorded.",
                  "The exam runs in fullscreen — exiting fullscreen triggers an instant alert.",
                  "Violations pause the exam with a full-screen notice you must acknowledge.",
                  "Keep your face visible and centred; ensure a stable internet connection.",
                  ...(exam.instructions ? [exam.instructions] : []),
                ].map((rule, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <FiShield className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                    {rule}
                  </li>
                ))}
              </ul>
            </div>

            {/* Requirements */}
            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
              <p className="font-semibold">Before you begin:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
                <li>Working webcam is required (browser permission will be requested).</li>
                <li>Face verification checks run before the exam starts.</li>
                <li>Do not switch tabs or applications during the exam.</li>
                <li>Use Chrome/Edge on desktop or laptop for best results.</li>
              </ul>
            </div>

            {/* Privacy notice */}
            <p className="mt-4 text-xs leading-5 text-slate-500">
              <strong>Privacy notice:</strong> webcam video is analysed in your browser
              using on-device face detection (face-api.js) and object detection (TensorFlow
              COCO-SSD). Only detection events and violation records — never video — are
              transmitted to the exam server.
            </p>

            {/* Checkbox */}
            <button
              type="button"
              onClick={() => setInstructionsAccepted((v) => !v)}
              className="mt-6 flex w-full items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-blue-300"
            >
              {instructionsAccepted ? (
                <FiCheckSquare className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
              ) : (
                <FiSquare className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
              )}
              <span className="text-sm text-slate-700">
                I have read and understood the examination instructions and rules, and I
                agree to be monitored via webcam and screen guards during the exam.
              </span>
            </button>

            <button
              type="button"
              disabled={!instructionsAccepted}
              onClick={() => setStep(2)}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Continue to Face Verification
              <FiArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ================= STEP 2 — FACE VERIFICATION =================
  if (step === 2) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-8">
        <div className="mx-auto max-w-3xl space-y-6">
          <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
            Step 2 of 3 — Face Verification
          </span>
          <h1 className="text-2xl font-bold text-slate-800">Verify Your Camera</h1>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Camera check */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-base font-semibold text-slate-800">
                <FiVideo className="h-5 w-5 text-blue-600" />
                Camera & Face Check
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Grant camera access and confirm your face is detectable. This runs on-device
                face detection using the same model that monitors your exam.
              </p>

              <button
                type="button"
                onClick={checkCamera}
                disabled={cameraChecking}
                className="mt-4 w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {cameraChecking
                  ? "Checking camera..."
                  : cameraGranted
                    ? "✓ Camera verified — check again"
                    : "Check Camera & Face"}
              </button>

              {cameraGranted && (
                <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                  <p className="font-semibold">Camera ready ✓</p>
                  <p className="mt-1 text-xs text-green-700">
                    Camera permission granted and a video stream is available. You can
                    proceed to the exam.
                  </p>
                </div>
              )}

              {/* Identity lock — reference face capture */}
              <div
                className={`mt-4 rounded-xl border p-4 ${
                  referenceFace
                    ? "border-green-200 bg-green-50"
                    : "border-blue-200 bg-blue-50"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="text-sm">
                    <p
                      className={`font-semibold ${
                        referenceFace ? "text-green-800" : "text-blue-800"
                      }`}
                    >
                      {referenceFace ? "Identity lock active ✓" : "Identity lock not set"}
                    </p>
                    <p
                      className={`mt-1 text-xs leading-5 ${
                        referenceFace ? "text-green-700" : "text-blue-700"
                      }`}
                    >
                      {referenceFace
                        ? "Your reference face is stored in memory only. If a different person appears during the exam, you get an instant full-screen alert and the invigilator is notified immediately."
                        : "Look at the camera — we try to capture your face automatically, or press Lock My Face."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => captureFace()}
                    disabled={faceCapturing || !cameraGranted}
                    className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold text-white disabled:opacity-60 ${
                      referenceFace
                        ? "bg-slate-600 hover:bg-slate-700"
                        : "bg-blue-600 hover:bg-blue-700"
                    }`}
                  >
                    {faceCapturing
                      ? "Capturing..."
                      : referenceFace
                        ? "Re-capture"
                        : "Lock My Face"}
                  </button>
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs leading-5 text-blue-800">
                <strong>How identity check works:</strong> face matching runs
                on-device in your browser — your face image is never uploaded.
                The backend additionally exposes{" "}
                <code>POST /api/face/verify</code> for independent
                descriptor-only confirmation (numeric descriptors, never
                photos); the on-device check remains the primary lock during
                your exam.
              </div>
            </section>

            {/* Live preview */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-base font-semibold text-slate-800">Live Preview</h2>
              <ProctoringPanel
                examId={null}
                enabled={cameraGranted}
                compact
                onApiReady={(api) => {
                  faceApiRef.current = api;
                }}
              />
            </section>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex items-center gap-2 rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              <FiArrowLeft className="h-4 w-4" />
              Back
            </button>
            <button
              type="button"
              onClick={startExam}
              disabled={!cameraGranted}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Start Proctored Exam
              <FiArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ================= STEP 3 — EXAM =================
  const q = questions[current];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Instant full-screen interrupt (one at a time, queued) */}
      <InterruptOverlay interrupt={activeInterrupt} onAcknowledge={acknowledgeInterrupt} />

      {/* Exam header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold text-slate-800">{exam.title}</h1>
            <p className="text-xs text-slate-500">
              {questions.length > 0
                ? `Question ${current + 1} of ${questions.length}`
                : "Proctored session"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {totalIncidents > 0 && (
              <span
                className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-700"
                title={Object.entries(incidentCounts).map(([k, v]) => `${INCIDENT_LABELS[k] || k}: ${v}`).join(" · ")}
              >
                <FiAlertTriangle className="h-3.5 w-3.5" />
                {totalIncidents} alert{totalIncidents !== 1 && "s"}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1.5 text-xs font-bold text-red-700">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
              PROCTORED
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold tabular-nums ${
                secondsLeft < 60
                  ? "bg-red-100 text-red-700"
                  : secondsLeft < 300
                    ? "bg-amber-100 text-amber-700"
                    : "bg-slate-100 text-slate-700"
              }`}
            >
              <FiClock className="h-4 w-4" />
              {formatTime(secondsLeft)}
            </span>
            <button
              type="button"
              onClick={() => setShowSubmit(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700"
            >
              <FiSend className="h-3.5 w-3.5" />
              Submit
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 p-4 sm:p-6 lg:grid-cols-[1fr_320px]">
        {/* Main question area */}
        <div className="space-y-5">
          {questions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-6">
              <div className="flex items-start gap-3">
                <FiAlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div>
                  <h2 className="text-sm font-semibold text-amber-800">
                    Question paper not added yet
                  </h2>
                  <p className="mt-1.5 text-xs leading-5 text-amber-700">
                    Your teacher has not added questions to this exam. The proctored
                    session, timer, screen guards and submission are fully active — the
                    paper will appear here the moment questions are added.
                  </p>
                </div>
              </div>
            </div>
          ) : q.type === "coding" ? (
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
                    Coding question
                  </span>
                  <h2 className="mt-2 text-base font-semibold text-slate-800">
                    Question {current + 1}
                  </h2>
                </div>
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                  {q.marks ?? 10} marks
                </span>
              </div>

              <p className="mb-1 whitespace-pre-wrap text-sm leading-7 text-slate-800">
                {q.questionText}
              </p>
              {q.expectedApproach && (
                <p className="mb-4 text-xs text-slate-500">
                  <strong>Expected approach:</strong> {q.expectedApproach}
                </p>
              )}

              <div className="mt-4">
                <CodeEditor
                  value={answers[q._id]?.code ?? q.starterCode ?? ""}
                  language={answers[q._id]?.language ?? q.language ?? "javascript"}
                  onChange={(code) => updateCode(q._id, code, undefined)}
                  onLanguageChange={(lang) =>
                    updateCode(q._id, answers[q._id]?.code ?? q.starterCode ?? "", lang)
                  }
                />
              </div>

              <p className="mt-2 text-[11px] text-slate-400">
                Your code is saved with your submission and reviewed by your teacher
                (interview-style). Autosaved in this session as you type.
              </p>
            </section>
          ) : (
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-start justify-between gap-3">
                <h2 className="text-base font-semibold text-slate-800">Question {current + 1}</h2>
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                  {q?.marks ?? 1} mark{(q?.marks ?? 1) > 1 && "s"}
                </span>
              </div>

              <p className="whitespace-pre-wrap text-sm leading-7 text-slate-800">
                {q?.questionText}
              </p>

              <div className="mt-5 space-y-3">
                {(q?.options || []).map((opt) => {
                  const selected = answers[q._id] === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => selectAnswer(q._id, opt.id)}
                      className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left text-sm transition ${
                        selected
                          ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100"
                          : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                          selected ? "border-blue-600 bg-blue-600" : "border-slate-300"
                        }`}
                      >
                        {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </span>
                      <span className="text-slate-700">{opt.text}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Question navigation */}
          {questions.length > 0 && (
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-slate-800">Question Navigation</h3>
              <div className="flex flex-wrap gap-2">
                {questions.map((question, i) => {
                  const isMarked = marked[question._id];
                  const isAnswered = isQuestionAnswered(question);
                  const isCurrent = i === current;
                  const isVisited = visited[i];

                  let cls = "border-slate-200 bg-slate-50 text-slate-600";
                  if (isCurrent) cls = "border-blue-600 bg-blue-600 text-white";
                  else if (isMarked) cls = "border-purple-500 bg-purple-100 text-purple-700";
                  else if (isAnswered) cls = "border-green-500 bg-green-100 text-green-700";
                  else if (isVisited) cls = "border-amber-400 bg-amber-100 text-amber-700";

                  return (
                    <button
                      key={question._id}
                      type="button"
                      onClick={() => goTo(i)}
                      className={`h-10 w-10 rounded-lg border-2 text-sm font-bold transition ${cls}`}
                      title={`Q${i + 1}${question.type === "coding" ? " (coding)" : ""}`}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-sm bg-slate-100 ring-1 ring-slate-300" /> Not Visited
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-sm bg-amber-200" /> Not Answered
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-sm bg-green-200" /> Answered
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-sm bg-purple-200" /> Marked for Review
                </span>
              </div>
            </section>
          )}

          {/* Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => goTo(current - 1)}
              disabled={current === 0}
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FiArrowLeft className="h-4 w-4" />
              Previous
            </button>

            <button
              type="button"
              onClick={toggleMark}
              disabled={questions.length === 0}
              className="flex items-center gap-2 rounded-lg border border-purple-300 bg-purple-50 px-4 py-2.5 text-sm font-semibold text-purple-700 hover:bg-purple-100 disabled:opacity-50"
            >
              <FiFlag className="h-4 w-4" />
              Mark for Review
            </button>

            <button
              type="button"
              onClick={() => goTo(current + 1)}
              disabled={current >= questions.length - 1}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Save & Next
              <FiArrowRight className="h-4 w-4" />
            </button>
          </div>

          {questions.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <span className="text-green-700">Answered: {status.answered}</span>
                <span className="text-amber-700">Not Answered: {status.notAnswered}</span>
                <span className="text-purple-700">Marked: {status.marked}</span>
                <span className="text-slate-600">Not Visited: {status.notVisited}</span>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar — proctoring */}
        <aside className="space-y-5">
          <ProctoringPanel
            examId={examId}
            enabled
            onInterrupt={handleDetectionInterrupt}
            referenceDescriptor={referenceFace}
          />

          {/* Session incidents tally */}
          {totalIncidents > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <h3 className="text-xs font-bold uppercase tracking-wide text-amber-700">
                Session alerts
              </h3>
              <ul className="mt-2 space-y-1.5">
                {Object.entries(incidentCounts).map(([kind, count]) => (
                  <li
                    key={kind}
                    className="flex items-center justify-between text-xs text-amber-800"
                  >
                    <span>{INCIDENT_LABELS[kind] || kind}</span>
                    <span className="font-bold">{count}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 border-t border-amber-200 pt-2 text-[11px] text-amber-700">
                All alerts are recorded and visible to your invigilator in real time.
              </p>
            </div>
          )}
        </aside>
      </div>

      {/* Submit confirmation */}
      <ConfirmDialog
        open={showSubmit}
        title="Submit examination?"
        message={
          questions.length > 0
            ? `You have answered ${status.answered} of ${questions.length} questions. Once submitted you cannot change your answers.`
            : "Once submitted you cannot return to this exam."
        }
        confirmLabel="Submit Exam"
        loading={submitting}
        onConfirm={() => handleFinalSubmit(false)}
        onCancel={() => setShowSubmit(false)}
      />
    </div>
  );
}

export default ExamFlow;
