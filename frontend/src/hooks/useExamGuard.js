import { useEffect, useRef } from "react";

/**
 * Exam behaviour guard: watches browser-level behaviour while the exam is
 * running and fires onViolation({ type, details }) for every incident:
 *
 *   TAB_SWITCH      — tab hidden or window blurred
 *   COPY_PASTE      — copy / cut / paste attempted (also blocked)
 *   RIGHT_CLICK     — context menu attempted (also blocked)
 *   FULLSCREEN_EXIT — left fullscreen during the exam
 *
 * The callback decides what to show (interrupt overlay) and what to report
 * to the backend (POST /api/violations) — this hook only detects and blocks.
 *
 * @param {boolean} enabled         guard active only while exam step is live
 * @param {(v: {type: string, details: string}) => void} onViolation
 */
export default function useExamGuard(enabled, onViolation) {
  const cbRef = useRef(onViolation);
  cbRef.current = onViolation;

  const wasFullscreenRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      wasFullscreenRef.current = false;
      return;
    }

    const emit = (type, details) => cbRef.current?.({ type, details });

    // --- Tab / window focus loss ---
    const onVisibility = () => {
      if (document.hidden) {
        emit("TAB_SWITCH", "Exam tab went to the background");
      }
    };
    const onWindowBlur = () => {
      emit("TAB_SWITCH", "Exam window lost focus");
    };

    // --- Copy / cut / paste blocked ---
    const blockClipboard = (name) => (event) => {
      event.preventDefault();
      emit("COPY_PASTE", `${name} attempt blocked`);
    };
    const onCopy = blockClipboard("Copy");
    const onCut = blockClipboard("Cut");
    const onPaste = blockClipboard("Paste");

    // --- Right-click blocked ---
    const onContextMenu = (event) => {
      event.preventDefault();
      emit("RIGHT_CLICK", "Context menu blocked");
    };

    // --- Fullscreen exit ---
    const onFullscreenChange = () => {
      const inFullscreen = Boolean(document.fullscreenElement);
      if (wasFullscreenRef.current && !inFullscreen) {
        emit("FULLSCREEN_EXIT", "Candidate left fullscreen mode");
      }
      wasFullscreenRef.current = inFullscreen;
    };

    // If fullscreen is already active when the guard mounts, track it
    wasFullscreenRef.current = Boolean(document.fullscreenElement);

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onWindowBlur);
    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCut);
    document.addEventListener("paste", onPaste);
    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("fullscreenchange", onFullscreenChange);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onWindowBlur);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCut);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, [enabled]);
}
