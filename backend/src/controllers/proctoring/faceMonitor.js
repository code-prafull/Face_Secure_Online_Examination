import { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";

const FaceMonitor = ({ onEvent }) => {
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const intervalRef = useRef(null);
    const noFaceStartRef = useRef(null);
    const eventSentRef = useRef(false);

    const [status, setStatus] = useState("Initializing...");
    const [faceCount, setFaceCount] = useState(0);

    useEffect(() => {
        let isMounted = true;

        const startMonitoring = async () => {
            try {
                setStatus("Loading face detection models...");

                await faceapi.nets.tinyFaceDetector.loadFromUri(
                    "/models"
                );

                if (!isMounted) return;

                const stream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: false
                });

                streamRef.current = stream;

                if (!isMounted) {
                    stream.getTracks().forEach((track) => track.stop());
                    return;
                }

                videoRef.current.srcObject = stream;

                await videoRef.current.play();

                if (!isMounted) return;

                setStatus("Monitoring");

                intervalRef.current = setInterval(async () => {
                    if (
                        !videoRef.current ||
                        videoRef.current.readyState < 2
                    ) {
                        return;
                    }

                    const detections = await faceapi.detectAllFaces(
                        videoRef.current,
                        new faceapi.TinyFaceDetectorOptions()
                    );

                    if (!isMounted) return;

                    const count = detections.length;
                    setFaceCount(count);

                    if (count === 0) {
                        if (!noFaceStartRef.current) {
                            noFaceStartRef.current = Date.now();
                        }

                        const absentDuration =
                            Date.now() - noFaceStartRef.current;

                        if (
                            absentDuration >= 10000 &&
                            !eventSentRef.current
                        ) {
                            onEvent?.({
                                eventType: "NO_FACE",
                                details: "Candidate face absent for more than 10 seconds"
                            });

                            eventSentRef.current = true;
                        }
                    } else {
                        noFaceStartRef.current = null;
                        eventSentRef.current = false;
                    }

                    if (count > 1) {
                        onEvent?.({
                            eventType: "MULTIPLE_FACES",
                            details: `${count} faces detected`
                        });
                    }
                }, 3000);

            } catch (error) {
                console.error("Face monitoring error:", error);
                if (isMounted) {
                    setStatus("Camera or model initialization failed");
                }
            }
        };

        startMonitoring();

        return () => {
            isMounted = false;
            clearInterval(intervalRef.current);

            streamRef.current?.getTracks().forEach((track) => {
                track.stop();
            });
        };
    }, [onEvent]);

    return (
        <div>
            <h2>Face Monitoring</h2>

            <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                width="640"
                height="480"
                style={{
                    border: "2px solid #333",
                    borderRadius: "8px"
                }}
            />

            <p>Status: {status}</p>
            <p>Faces detected: {faceCount}</p>
        </div>
    );
};

export default FaceMonitor;
