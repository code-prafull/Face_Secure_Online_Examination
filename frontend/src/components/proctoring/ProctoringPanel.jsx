import { useEffect, useRef } from "react";
import { FiVideo, FiVideoOff, FiUsers, FiSmartphone, FiCheck, FiAlertTriangle, FiRefreshCw } from "react-icons/fi";
import useProctoring from "../../hooks/useProctoring";
import { EVENT_TYPE_LABELS, EVENT_TYPE_DESCRIPTIONS } from "../../services/proctoringService";
import { getEventTypeColor, formatDateTime } from "../../utils/formatters";

/**
 * Live proctoring panel: camera preview + face boxes + mobile boxes +
 * status + backend-synced event feed.
 */
function ProctoringPanel({
  examId,
  enabled = true,
  onEvent,
  onInterrupt,
  compact = false,
  referenceDescriptor = null,
  onApiReady,
}) {
  const canvasRef = useRef(null);

  const proctor = useProctoring({
    examId,
    enabled,
    onEvent,
    onInterrupt,
    referenceDescriptor,
  });
  const {
    videoRef,
    cameraStatus,
    cameraError,
    modelStatus,
    faceCount,
    mobileDetected,
    boxes,
    events,
    backendLog,
    detections,
    startCamera,
    reportEvent,
    captureReference,
  } = proctor;

  // Expose the capture API to the parent (verification step uses it to
  // lock the candidate's reference face before the exam starts).
  const onApiReadyRef = useRef(onApiReady);
  onApiReadyRef.current = onApiReady;
  useEffect(() => {
    onApiReadyRef.current?.({ captureReference });
  }, [captureReference]);

  // Draw bounding boxes on overlay canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const draw = () => {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Face boxes — green when single, red when multiple
      const faceColor = boxes.faces.length > 1 ? "#ef4444" : boxes.faces.length === 1 ? "#22c55e" : "#94a3b8";
      boxes.faces.forEach((b) => {
        ctx.strokeStyle = faceColor;
        ctx.lineWidth = 3;
        ctx.strokeRect(b.x, b.y, b.w, b.h);
        ctx.fillStyle = faceColor;
        ctx.font = "bold 14px sans-serif";
        ctx.fillText(boxes.faces.length > 1 ? "EXTRA FACE" : "FACE", b.x, Math.max(b.y - 6, 14));
      });

      // Mobile boxes — amber/red
      boxes.mobile.forEach((b) => {
        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(b.x, b.y, b.w, b.h);
        ctx.setLineDash([]);
        ctx.fillStyle = "#f59e0b";
        ctx.font = "bold 14px sans-serif";
        ctx.fillText("MOBILE", b.x, Math.max(b.y - 6, 14));
      });
    };

    draw();
    const id = setInterval(draw, 500);
    return () => clearInterval(id);
  }, [boxes, videoRef, cameraStatus]);

  const faceStatus =
    cameraStatus !== "ready"
      ? { label: "Camera Off", cls: "bg-slate-100 text-slate-600" }
      : modelStatus === "loading"
        ? { label: "Loading Model", cls: "bg-amber-100 text-amber-700" }
        : (faceCount ?? 0) > 1
          ? { label: `${faceCount} Faces`, cls: "bg-red-100 text-red-700" }
          : faceCount === 1
            ? { label: "1 Face", cls: "bg-green-100 text-green-700" }
            : faceCount === 0
              ? { label: "No Face", cls: "bg-amber-100 text-amber-700" }
              : { label: "Detecting", cls: "bg-blue-100 text-blue-700" };

  const mobileStatus = !enabled
    ? { label: "Off", cls: "bg-slate-100 text-slate-600" }
    : mobileDetected
      ? { label: "Detected", cls: "bg-red-100 text-red-700" }
      : cameraStatus === "ready"
        ? { label: "Clear", cls: "bg-green-100 text-green-700" }
        : { label: "—", cls: "bg-slate-100 text-slate-600" };

  return (
    <div className="space-y-4">
      {/* Camera + boxes */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-950">
        <div className="flex items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-2 text-white">
            <FiVideo className="h-4 w-4" />
            <span className="text-sm font-semibold">Live Proctoring Feed</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              cameraStatus === "ready" ? "bg-green-500/20 text-green-300" :
              cameraStatus === "error" ? "bg-red-500/20 text-red-300" :
              "bg-amber-500/20 text-amber-300"
            }`}>
              {cameraStatus === "ready" ? "REC" : cameraStatus === "error" ? "ERROR" : "CONNECTING"}
            </span>
            {modelStatus === "ready" && (
              <span className="rounded-full bg-blue-500/20 px-2.5 py-1 text-xs font-semibold text-blue-300">
                AI ACTIVE
              </span>
            )}
            {referenceDescriptor && referenceDescriptor.length > 0 && (
              <span className="rounded-full bg-green-500/20 px-2.5 py-1 text-xs font-semibold text-green-300">
                IDENTITY LOCK
              </span>
            )}
          </div>
        </div>

        <div className="relative aspect-video bg-slate-900">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="h-full w-full object-cover"
          />
          <canvas
            ref={canvasRef}
            className="pointer-events-none absolute inset-0 h-full w-full"
          />

          {cameraStatus === "idle" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
              <FiVideoOff className="h-8 w-8 text-slate-500" />
              <p className="text-sm text-slate-400">Camera is off</p>
              <button
                onClick={startCamera}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Start Camera
              </button>
            </div>
          )}

          {cameraStatus === "requesting" && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-300">
              Requesting camera permission...
            </div>
          )}

          {cameraStatus === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center">
              <p className="text-sm text-red-300">{cameraError}</p>
              <button
                onClick={startCamera}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          )}

          {/* Warning banner over video */}
          {cameraStatus === "ready" && (faceCount ?? 0) > 1 && (
            <div className="absolute left-1/2 top-3 flex -translate-x-1/2 items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-lg">
              <FiAlertTriangle className="h-4 w-4" />
              {faceCount} FACES DETECTED — ONLY 1 PERSON ALLOWED
            </div>
          )}
          {cameraStatus === "ready" && mobileDetected && (
            <div className="absolute left-1/2 top-14 flex -translate-x-1/2 items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-white shadow-lg">
              <FiSmartphone className="h-4 w-4" />
              MOBILE PHONE DETECTED
            </div>
          )}
        </div>
      </div>

      {/* Status row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <FiUsers className="h-4 w-4" />
            Faces in frame
          </div>
          <div className="mt-1.5 flex items-center justify-between">
            <span className="text-2xl font-bold tabular-nums text-slate-800">
              {faceCount ?? "—"}
            </span>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${faceStatus.cls}`}>
              {faceStatus.label}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <FiSmartphone className="h-4 w-4" />
            Mobile phone
          </div>
          <div className="mt-1.5 flex items-center justify-between">
            <span className="text-2xl font-bold text-slate-800">
              {mobileDetected ? "!" : "0"}
            </span>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${mobileStatus.cls}`}>
              {mobileStatus.label}
            </span>
          </div>
        </div>
      </div>

      {!compact && (
        <>
          {/* Rules reminder */}
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs leading-5 text-blue-800">
            <strong>Active rules:</strong> Only one person must be visible in
            the camera. Mobile phones are not allowed in frame. Violations are
            logged to the backend and increase your suspicion score.
          </div>

          {/* Event feed */}
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-800">
                Detection Events
              </h3>
              <span className="text-xs text-slate-500">
                {detections} scans • {backendLog.length} logged to backend
              </span>
            </div>

            <div className="max-h-56 divide-y divide-slate-100 overflow-y-auto">
              {events.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-slate-500">
                  No violations detected yet.
                </p>
              ) : (
                events.map((e) => (
                  <div key={e.id} className="flex items-start gap-3 px-4 py-3">
                    <span className={`mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${getEventTypeColor(e.eventType)}`}>
                      {e.eventType}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-slate-700">
                        {e.details || EVENT_TYPE_LABELS[e.eventType]}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {formatDateTime(e.at)}
                      </p>
                    </div>
                    <span
                      className={`flex shrink-0 items-center gap-1 text-[11px] font-medium ${
                        e.synced ? "text-green-600" : "text-amber-600"
                      }`}
                      title={
                        e.synced
                          ? "Confirmed by backend (suspicion score updated)"
                          : e.syncError || "Waiting for backend sync"
                      }
                    >
                      {e.synced ? <FiCheck className="h-3.5 w-3.5" /> : <FiRefreshCw className="h-3.5 w-3.5" />}
                      {e.synced ? "Logged" : "Syncing"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Privacy notice */}
          <p className="text-[11px] leading-5 text-slate-500">
            <strong>Privacy notice:</strong> Your webcam feed is analysed in
            your browser (face + object detection). Only detection events —
            not video — are sent to the exam server for invigilator review.
            Detection is an indicator for review, not a final malpractice
            decision.
          </p>
        </>
      )}

      {/* Manual test trigger (development aid) */}
      {examId && cameraStatus === "ready" && (
        <button
          type="button"
          onClick={() => reportEvent("NO_FACE", "Manual probe event")}
          className="hidden rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          Probe backend event link
        </button>
      )}
    </div>
  );
}

export default ProctoringPanel;
