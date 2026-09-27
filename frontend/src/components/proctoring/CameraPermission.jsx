
import { useState } from "react";

function CameraPermission({ onPermissionGranted }) {
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const requestPermission = async () => {
    setStatus("loading");
    setError("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });

      // Release this temporary stream; the camera monitor
      // should acquire and manage its own stream afterward.
      stream.getTracks().forEach((track) => track.stop());

      setStatus("granted");
      onPermissionGranted?.();
    } catch (err) {
      setStatus("denied");
      setError(
        err.name === "NotAllowedError"
          ? "Camera permission was denied. Allow camera access in your browser settings."
          : "Unable to access the camera. Check that it is connected and available."
      );
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="text-lg font-semibold text-gray-800">
        Camera Permission
      </h2>

      <p className="mt-2 text-sm text-gray-600">
        Camera access is required for exam monitoring.
      </p>

      {status === "granted" && (
        <p className="mt-3 text-sm font-medium text-green-700">
          Camera permission granted.
        </p>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={requestPermission}
        disabled={status === "loading" || status === "granted"}
        className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {status === "loading"
          ? "Requesting permission..."
          : status === "granted"
            ? "Permission granted"
            : "Allow camera"}
      </button>
    </div>
  );
}

export default CameraPermission;
