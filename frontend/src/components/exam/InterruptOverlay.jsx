import { useEffect, useState } from "react";
import {
  FiAlertTriangle,
  FiUsers,
  FiSmartphone,
  FiEyeOff,
  FiMonitor,
  FiClipboard,
  FiMaximize,
  FiUserX,
} from "react-icons/fi";

/**
 * Full-screen interrupt shown the instant a violation is detected during a
 * live exam (multiple faces, mobile phone, missing face, tab switch,
 * copy/paste, fullscreen exit). The exam is blocked until the candidate
 * acknowledges, and a short beep draws attention back to the screen.
 *
 * Only one interrupt shows at a time; queued ones appear after acknowledge.
 */

const KINDS = {
  MULTIPLE_FACES: {
    icon: FiUsers,
    tone: "critical",
    title: "Multiple People Detected",
    message:
      "More than one person is visible in the camera. Only the registered candidate may be in frame. Everyone else must leave immediately.",
  },
  MOBILE_DETECTED: {
    icon: FiSmartphone,
    tone: "critical",
    title: "Mobile Phone Detected",
    message:
      "A mobile phone is visible in the camera frame. Remove it from view immediately. Mobile phones are strictly prohibited during the exam.",
  },
  NO_FACE: {
    icon: FiEyeOff,
    tone: "warning",
    title: "Face Not Visible",
    message:
      "Your face is not visible in the camera. Sit upright and face the camera now so monitoring can continue.",
  },
  TAB_SWITCH: {
    icon: FiMonitor,
    tone: "critical",
    title: "Exam Window Left",
    message:
      "You switched away from the exam window. This has been recorded. Return to the exam and stay on this screen.",
  },
  COPY_PASTE: {
    icon: FiClipboard,
    tone: "critical",
    title: "Copy/Paste Blocked",
    message:
      "Copying or pasting is disabled during this exam. The attempt has been recorded.",
  },
  RIGHT_CLICK: {
    icon: FiClipboard,
    tone: "warning",
    title: "Right-Click Disabled",
    message: "The context menu is disabled during this exam. The attempt has been recorded.",
  },
  FULLSCREEN_EXIT: {
    icon: FiMaximize,
    tone: "warning",
    title: "Fullscreen Exited",
    message:
      "You left fullscreen mode. Return to fullscreen to continue the monitored exam.",
  },
  UNKNOWN_FACE: {
    icon: FiUserX,
    tone: "critical",
    title: "Unrecognized Person Detected",
    message:
      "The face in the camera does not match the candidate registered for this exam. Only the registered candidate may be in frame — the invigilator has been alerted.",
  },
};

const toneClasses = {
  critical: {
    ring: "border-red-500",
    bg: "bg-red-600",
    iconBg: "bg-white/20",
    button: "bg-white text-red-700 hover:bg-red-50",
  },
  warning: {
    ring: "border-amber-500",
    bg: "bg-amber-500",
    iconBg: "bg-white/20",
    button: "bg-white text-amber-700 hover:bg-amber-50",
  },
};

function beep() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    [0, 0.28].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.12, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.24);
    });
    setTimeout(() => ctx.close().catch(() => {}), 900);
  } catch {
    /* audio unavailable — visual interrupt still works */
  }
}

function InterruptOverlay({ interrupt, onAcknowledge }) {
  const [secondsLeft, setSecondsLeft] = useState(8);

  const config = interrupt ? KINDS[interrupt.kind] || KINDS.TAB_SWITCH : null;

  useEffect(() => {
    if (!interrupt) return;
    setSecondsLeft(8);
    beep();
  }, [interrupt?.id]);

  useEffect(() => {
    if (!interrupt) return;
    const id = setInterval(() => {
      setSecondsLeft((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [interrupt?.id]);

  // Auto-dismiss via effect (never call parent setState inside an updater)
  useEffect(() => {
    if (!interrupt) return;
    if (secondsLeft === 0) onAcknowledge?.();
  }, [secondsLeft, interrupt, onAcknowledge]);

  if (!interrupt || !config) return null;

  const Icon = config.icon;
  const tone = toneClasses[config.tone] || toneClasses.critical;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label={config.title}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
    >
      <div
        className={`w-full max-w-lg rounded-2xl border-4 ${tone.ring} ${tone.bg} p-7 text-center text-white shadow-2xl`}
      >
        <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${tone.iconBg}`}>
          <Icon className="h-9 w-9" />
        </div>

        <div className="mb-1 inline-block rounded-full bg-black/25 px-3 py-1 text-[11px] font-bold uppercase tracking-widest">
          Live alert — exam paused
        </div>

        <h2 className="mt-2 text-2xl font-extrabold">{config.title}</h2>
        <p className="mt-3 text-sm leading-6 text-white/95">{config.message}</p>

        <p className="mt-4 text-xs font-semibold text-white/80">
          This incident has been recorded and sent to your invigilator.
          {interrupt.details ? ` (${interrupt.details})` : ""}
        </p>

        <button
          type="button"
          onClick={onAcknowledge}
          className={`mt-6 w-full rounded-xl px-5 py-3 text-sm font-bold transition ${tone.button}`}
        >
          I understand — return to exam
        </button>

        <p className="mt-3 text-[11px] text-white/70">
          Auto-dismiss in {secondsLeft}s
        </p>
      </div>
    </div>
  );
}

export default InterruptOverlay;
