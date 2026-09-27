
import { useEffect, useRef, useState } from "react";

function CameraPreview({ onCameraReady, onCameraError }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [cameraStatus, setCameraStatus] = useState("requesting");
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const startCamera = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error(
            "Camera access is unavailable. Use HTTPS or localhost."
          );
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
          audio: false,
        });

        if (!isMounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        if (!isMounted) return;

        setCameraStatus("ready");
        onCameraReady?.(stream);
      } catch (err) {
        if (!isMounted) return;

        const message =
          err.name === "NotAllowedError"
            ? "Camera permission was denied. Allow camera access to continue."
            : err.name === "NotFoundError"
              ? "No camera was found on this device."
              : err.message || "Unable to access the camera.";

        setError(message);
        setCameraStatus("error");
        onCameraError?.(message);
      }
    };

    startCamera();

    return () => {
      isMounted = false;

      streamRef.current?.getTracks().forEach((track) => {
        track.stop();
      });

      streamRef.current = null;

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [onCameraReady, onCameraError]);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-950">
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <h2 className="text-sm font-semibold">Camera Preview</h2>

        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
            cameraStatus === "ready"
              ? "bg-green-500/20 text-green-300"
              : cameraStatus === "error"
                ? "bg-red-500/20 text-red-300"
                : "bg-amber-500/20 text-amber-300"
          }`}
        >
          {cameraStatus === "ready"
            ? "Camera On"
            : cameraStatus === "error"
              ? "Camera Error"
              : "Connecting..."}
        </span>
      </div>

      <div className="relative aspect-video bg-slate-900">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="h-full w-full object-cover"
        />

        {cameraStatus === "requesting" && (
          <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-white">
            Requesting camera access...
          </div>
        )}

        {cameraStatus === "error" && (
          <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-red-300">
            {error}
          </div>
        )}
      </div>

      <p className="px-4 py-3 text-xs leading-5 text-slate-300">
        Keep your face visible in the camera frame during the exam.
      </p>
    </div>
  );
}

export default CameraPreview;
