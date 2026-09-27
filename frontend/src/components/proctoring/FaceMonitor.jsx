import { useMemo, useState } from "react";
import CameraPreview from "./CameraPreview";
import ProctoringStatus from "./ProctoringStatus";

function FaceMonitor({ examId, referenceImageUrl, onEvent }) {
  const [cameraStatus, setCameraStatus] = useState("ready");
  const [faceStatus, setFaceStatus] = useState("loading");

  const monitoringState = useMemo(() => {
    return {
      camera: cameraStatus,
      faceDetection: faceStatus,
      eventMonitoring: "ready",
    };
  }, [cameraStatus, faceStatus]);

  const handleCameraReady = () => {
    setCameraStatus("ready");
    setFaceStatus("ready");
  };

  const handleCameraError = (message) => {
    setCameraStatus("error");
    setFaceStatus("error");
    console.warn("Face monitor camera error:", message);
  };

  return (
    <div className="space-y-4">
      <CameraPreview
        onCameraReady={handleCameraReady}
        onCameraError={handleCameraError}
      />

      <ProctoringStatus
        camera={monitoringState.camera}
        faceDetection={monitoringState.faceDetection}
        eventMonitoring={monitoringState.eventMonitoring}
      />

      {referenceImageUrl && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
          Reference image is configured for the exam session.
        </div>
      )}

      <button
        type="button"
        onClick={() => onEvent?.({
          exam: examId,
          eventType: "NO_FACE",
          details: "Manual monitor check",
        })}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
      >
        Trigger monitor check
      </button>
    </div>
  );
}

export default FaceMonitor;
