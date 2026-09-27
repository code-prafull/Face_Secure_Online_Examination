import { useCallback, useEffect, useRef, useState } from "react";
import { sendProctoringEvent, sendViolation } from "../services/proctoringService";

// Heavy ML libraries are loaded lazily so the main bundle stays small;
// they only load when proctoring actually starts.
// NOTE: @vladmandic/face-api is the maintained fork of face-api.js built for
// modern TensorFlow.js — the original face-api.js@0.22 pins tfjs-core@1.7
// (no kernels), which throws "t is not a function" when running detection.
let faceapiPromise = null;
let cocoPromise = null;

const loadFaceApi = () => {
  if (!faceapiPromise) faceapiPromise = import("@vladmandic/face-api");
  return faceapiPromise;
};

const loadCoco = async () => {
  if (!cocoPromise) {
    cocoPromise = (async () => {
      await import("@tensorflow/tfjs");
      const cocoSsd = await import("@tensorflow-models/coco-ssd");
      return cocoSsd.load({ base: "lite_mobilenet_v2" });
    })();
  }
  return cocoPromise;
};

/**
 * Core proctoring engine.
 *
 * Detects (in the live webcam feed):
 *  - Multiple faces  -> MULTIPLE_FACES event  (backend verified, logged)
 *  - No face         -> NO_FACE event          (backend verified, logged)
 *  - Cell phone      -> MOBILE_DETECTED event  (backend verified, logged)
 *  - Identity mismatch -> UNKNOWN_FACE violation (face present that does
 *    not match the reference face captured at verification; posted to
 *    /api/violations which is additive and accepts camera-independent types)
 *
 * All camera events are POSTed to /api/events which updates the backend
 * suspicion score. Events are throttled so the backend score is not
 * spammed.
 */

const DETECT_INTERVAL_MS = 2500;
const NO_FACE_THRESHOLD_MS = 10000;
const EVENT_COOLDOWN_MS = {
  MULTIPLE_FACES: 20000,
  NO_FACE: 30000,
  MOBILE_DETECTED: 20000,
};
// Identity violations go to /api/violations (own endpoint + cooldown).
const VIOLATION_COOLDOWN_MS = {
  UNKNOWN_FACE: 20000,
};
// Overlay interrupts use their own shorter cooldown so the full-screen
// alert fires the moment a violation is detected, independent of how
// often the backend event (suspicion score) is allowed to post.
const INTERRUPT_COOLDOWN_MS = {
  MULTIPLE_FACES: 12000,
  MOBILE_DETECTED: 12000,
  NO_FACE: 15000,
  UNKNOWN_FACE: 15000,
};
const MOBILE_CONFIDENCE_THRESHOLD = 0.55;
// Face-descriptor matching: euclidean distance <= 0.55 is accepted as the
// same person (face-api's standard same-person threshold is 0.6).
const FACE_MATCH_THRESHOLD = 0.55;

// Loads the full face stack: detector + landmarks + recognition
// (recognition is what powers the identity lock / UNKNOWN_FACE check).
const loadFaceModel = async () => {
  const faceapi = await loadFaceApi();
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
    faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
    faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
  ]);
  return faceapi;
};

// Box extraction that works for both plain detections (detection.box
// exposed as .box) and landmark/descriptor chains (.detection.box).
const boxOf = (face) => {
  const b = face?.detection?.box || face?.box;
  if (!b) return null;
  return { x: b.x, y: b.y, w: b.width ?? b.w, h: b.height ?? b.h };
};

export default function useProctoring({
  examId,
  enabled = true,
  onEvent,
  onInterrupt,
  referenceDescriptor = null,
}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const modelsRef = useRef({ faceReady: false, cocoReady: false, coco: null, faceapi: null });
  const noFaceSinceRef = useRef(null);
  const lastSentRef = useRef({ MULTIPLE_FACES: 0, NO_FACE: 0, MOBILE_DETECTED: 0 });
  const lastViolationRef = useRef({ UNKNOWN_FACE: 0 });
  const lastInterruptRef = useRef({
    MULTIPLE_FACES: 0,
    NO_FACE: 0,
    MOBILE_DETECTED: 0,
    UNKNOWN_FACE: 0,
  });
  const referenceDescriptorRef = useRef(referenceDescriptor);
  const interruptIdsRef = useRef(0);
  const onEventRef = useRef(onEvent);
  const onInterruptRef = useRef(onInterrupt);
  const sentEventIdsRef = useRef(0);

  onEventRef.current = onEvent;
  onInterruptRef.current = onInterrupt;
  referenceDescriptorRef.current = referenceDescriptor;

  const [cameraStatus, setCameraStatus] = useState("idle"); // idle | requesting | ready | error
  const [cameraError, setCameraError] = useState("");
  const [modelStatus, setModelStatus] = useState("loading"); // loading | ready | error
  const [faceCount, setFaceCount] = useState(null);
  const [mobileDetected, setMobileDetected] = useState(false);
  const [boxes, setBoxes] = useState({ faces: [], mobile: [] });
  const [events, setEvents] = useState([]); // local event log
  const [backendLog, setBackendLog] = useState([]); // confirmed backend responses
  const [lastEventAt, setLastEventAt] = useState(null);
  const [detections, setDetections] = useState(0);

  // ---- Start camera ----
  const startCamera = useCallback(async () => {
    setCameraStatus("requesting");
    setCameraError("");

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera access unavailable. Use HTTPS or localhost.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      setCameraStatus("ready");
      return stream;
    } catch (err) {
      const message =
        err.name === "NotAllowedError"
          ? "Camera permission denied. Allow camera access to continue."
          : err.name === "NotFoundError"
            ? "No camera found on this device."
            : err.message || "Unable to access the camera.";

      setCameraError(message);
      setCameraStatus("error");
      return null;
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraStatus("idle");
  }, []);

  // Auto-start the camera the moment proctoring is enabled (exam start or
  // verification preview) so detection can never silently sit idle — a
  // proctored session must not begin with the camera off.
  useEffect(() => {
    if (enabled && cameraStatus === "idle") {
      startCamera();
    }
  }, [enabled, cameraStatus, startCamera]);

  // ---- Load detection models ----
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setModelStatus("loading");
      try {
        const faceapi = await loadFaceModel();
        if (cancelled) return;
        modelsRef.current.faceReady = true;
        modelsRef.current.faceapi = faceapi;

        const coco = await loadCoco();
        if (cancelled) return;
        modelsRef.current.coco = coco;
        modelsRef.current.cocoReady = true;

        setModelStatus("ready");
      } catch (err) {
        console.error("Proctoring model load failed:", err);
        if (!cancelled) setModelStatus("error");
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---- Report event: instant interrupt + throttled backend post ----
  const reportEvent = useCallback(
    async (eventType, details) => {
      if (!examId) return;

      const now = Date.now();

      // 1) Full-screen interrupt — fires the moment detection sees a
      //    violation (own cooldown so the overlay is never silent).
      const interruptCooldown = INTERRUPT_COOLDOWN_MS[eventType] ?? 12000;
      if (now - lastInterruptRef.current[eventType] >= interruptCooldown) {
        lastInterruptRef.current[eventType] = now;
        onInterruptRef.current?.({
          id: ++interruptIdsRef.current,
          kind: eventType,
          details,
        });
      }

      // 2) Backend event (suspicion score) — throttled separately.
      const cooldown = EVENT_COOLDOWN_MS[eventType] || 20000;
      if (now - lastSentRef.current[eventType] < cooldown) return;
      lastSentRef.current[eventType] = now;

      const localEvent = {
        id: ++sentEventIdsRef.current,
        eventType,
        details,
        at: new Date().toISOString(),
        source: "detection",
        synced: false,
      };
      setEvents((prev) => [localEvent, ...prev].slice(0, 50));
      setLastEventAt(localEvent.at);

      onEventRef.current?.({ exam: examId, eventType, details });

      try {
        const result = await sendProctoringEvent({ exam: examId, eventType, details });
        localEvent.synced = true;
        setBackendLog((prev) => [
          {
            id: localEvent.id,
            eventType,
            details,
            suspicionScore: result?.suspicionScore?.score ?? null,
            at: localEvent.at,
          },
          ...prev,
        ].slice(0, 50));
        setEvents((prev) =>
          prev.map((e) => (e.id === localEvent.id ? { ...e, synced: true } : e))
        );
      } catch (err) {
        console.error("Proctoring event sync failed:", err?.message || err);
        setEvents((prev) =>
          prev.map((e) =>
            e.id === localEvent.id
              ? { ...e, synced: false, syncError: err?.message || "Sync failed" }
              : e
          )
        );
      }
    },
    [examId, onEvent]
  );

  // ---- Identity lock: capture the candidate's reference face ----
  // Called from the verification step (Step 2). The returned 128-D
  // descriptor is stored by the caller and fed back in as
  // `referenceDescriptor` during the exam, where every detected face is
  // compared against it.
  const captureReference = useCallback(async () => {
    try {
      const faceapi = await loadFaceModel();
      const video = videoRef.current;
      if (!video || video.readyState < 2 || !video.videoWidth) return null;
      const det = await faceapi
        .detectSingleFace(
          video,
          new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.4 })
        )
        .withFaceLandmarks()
        .withFaceDescriptor();
      if (!det) return null;
      return Array.from(det.descriptor);
    } catch (err) {
      console.warn("Reference face capture failed:", err?.message);
      return null;
    }
  }, []);

  // ---- Identity mismatch (UNKNOWN_FACE): instant interrupt + backend ----
  const reportIdentityMismatch = useCallback(
    async (details) => {
      const now = Date.now();

      // 1) Full-screen interrupt — fires the moment a non-matching face
      //    is seen (own cooldown, independent of the backend throttle).
      if (now - lastInterruptRef.current.UNKNOWN_FACE >= INTERRUPT_COOLDOWN_MS.UNKNOWN_FACE) {
        lastInterruptRef.current.UNKNOWN_FACE = now;
        onInterruptRef.current?.({
          id: ++interruptIdsRef.current,
          kind: "UNKNOWN_FACE",
          details,
        });
      }

      // 2) Backend violation (POST /api/violations) — throttled separately.
      if (!examId) return;
      if (now - lastViolationRef.current.UNKNOWN_FACE < VIOLATION_COOLDOWN_MS.UNKNOWN_FACE) return;
      lastViolationRef.current.UNKNOWN_FACE = now;

      const localEvent = {
        id: ++sentEventIdsRef.current,
        eventType: "UNKNOWN_FACE",
        details,
        at: new Date().toISOString(),
        source: "identity",
        synced: false,
      };
      setEvents((prev) => [localEvent, ...prev].slice(0, 50));
      setLastEventAt(localEvent.at);
      onEventRef.current?.({ exam: examId, eventType: "UNKNOWN_FACE", details });

      try {
        const result = await sendViolation({ exam: examId, type: "UNKNOWN_FACE", details });
        localEvent.synced = true;
        setBackendLog((prev) =>
          [
            {
              id: localEvent.id,
              eventType: "UNKNOWN_FACE",
              details,
              suspicionScore: result?.suspicionScore?.score ?? null,
              at: localEvent.at,
            },
            ...prev,
          ].slice(0, 50)
        );
        setEvents((prev) =>
          prev.map((e) => (e.id === localEvent.id ? { ...e, synced: true } : e))
        );
      } catch (err) {
        console.warn("Identity violation sync failed:", err?.message || err);
        setEvents((prev) =>
          prev.map((e) =>
            e.id === localEvent.id
              ? { ...e, synced: false, syncError: err?.message || "Sync failed" }
              : e
          )
        );
      }
    },
    [examId]
  );

  // ---- Detection loop ----
  useEffect(() => {
    if (!enabled || cameraStatus !== "ready" || modelStatus !== "ready") return;

    let cancelled = false;

    timerRef.current = setInterval(async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2 || cancelled) return;

      try {
        // --- Face detection (multi-face / no face / identity lock) ---
        if (modelsRef.current.faceReady && modelsRef.current.faceapi) {
          const faceapi = modelsRef.current.faceapi;
          const detectorOpts = new faceapi.TinyFaceDetectorOptions({
            inputSize: 320,
            scoreThreshold: 0.4,
          });

          const refDesc = referenceDescriptorRef.current;
          let faces;
          if (refDesc && refDesc.length) {
            // Identity lock active: single pass yields boxes + landmarks +
            // 128-D descriptor for every face in frame.
            faces = await faceapi
              .detectAllFaces(video, detectorOpts)
              .withFaceLandmarks()
              .withFaceDescriptors();
          } else {
            faces = await faceapi.detectAllFaces(video, detectorOpts);
          }

          if (cancelled) return;

          const count = faces.length;
          setFaceCount(count);
          setDetections((d) => d + 1);
          setBoxes((b) => ({
            ...b,
            faces: faces
              .map((f) => boxOf(f))
              .filter(Boolean),
          }));

          if (count === 0) {
            if (!noFaceSinceRef.current) noFaceSinceRef.current = Date.now();
            const absentMs = Date.now() - noFaceSinceRef.current;
            if (absentMs >= NO_FACE_THRESHOLD_MS) {
              reportEvent(
                "NO_FACE",
                `Candidate face absent for more than ${Math.round(absentMs / 1000)} seconds`
              );
            }
          } else {
            noFaceSinceRef.current = null;
          }

          if (count > 1) {
            reportEvent(
              "MULTIPLE_FACES",
              `${count} faces detected in camera frame`
            );
          }

          // Identity lock: faces are in frame but none of them match the
          // reference face captured at verification -> different person.
          if (refDesc && refDesc.length && count > 0) {
            const anyMatch = faces.some(
              (f) =>
                f.descriptor &&
                faceapi.euclideanDistance(f.descriptor, refDesc) <= FACE_MATCH_THRESHOLD
            );
            if (!anyMatch) {
              reportIdentityMismatch(
                `${count} face${count > 1 ? "s" : ""} in frame, none matching the registered candidate's reference face`
              );
            }
          }
        }

        // --- Mobile / cell phone detection (object detection) ---
        if (modelsRef.current.cocoReady && modelsRef.current.coco) {
          const predictions = await modelsRef.current.coco.detect(video);

          if (cancelled) return;

          const phones = predictions.filter(
            (p) =>
              (p.class === "cell phone" || p.class === "mobile phone") &&
              p.score >= MOBILE_CONFIDENCE_THRESHOLD
          );

          const hasMobile = phones.length > 0;
          setMobileDetected(hasMobile);
          setBoxes((b) => ({
            ...b,
            mobile: phones.map((p) => ({
              x: p.bbox[0],
              y: p.bbox[1],
              w: p.bbox[2],
              h: p.bbox[3],
              score: p.score,
            })),
          }));

          if (hasMobile) {
            reportEvent(
              "MOBILE_DETECTED",
              `Mobile phone detected in camera frame (${Math.round(
                phones[0].score * 100
              )}% confidence)`
            );
          }
        }
      } catch (err) {
        // Detection loop must never crash the exam UI
        console.warn("Detection cycle error:", err?.message);
      }
    }, DETECT_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(timerRef.current);
      noFaceSinceRef.current = null;
    };
  }, [enabled, cameraStatus, modelStatus, reportEvent, reportIdentityMismatch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const faceOk = cameraStatus === "ready" && faceCount >= 1 && faceCount <= 1;
  const multiFace = (faceCount ?? 0) > 1;

  return {
    videoRef,
    startCamera,
    stopCamera,
    cameraStatus,
    cameraError,
    modelStatus,
    faceCount,
    mobileDetected,
    boxes,
    events,
    backendLog,
    lastEventAt,
    detections,
    faceOk,
    multiFace,
    reportEvent,
    captureReference,
  };
}
