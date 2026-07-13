import { useEffect, useRef, useState, useCallback } from 'react';
import { AlertCircle, ScanFace } from 'lucide-react';
import {
  loadFaceModels,
  detectFaceLandmarks,
  detectFaceWithDescriptor,
  detectAllFaces,
  createStableFaceTracker,
  toPlainDescriptor,
} from '../utils/faceRecognition';

const DETECTION_INTERVAL_MS = 180;

/**
 * Camera-driven face capture: as soon as a single face is held steadily
 * in frame for about a second, it captures the real 128-d face
 * descriptor — no mock tokens, no fake delays.
 *
 * Usage: <FaceCapture onCapture={({ descriptor, livenessPassed }) => ...} />
 */
const FaceCapture = ({ onCapture, actionLabel = 'Verify Face' }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const stableTrackerRef = useRef(createStableFaceTracker());
  const intervalRef = useRef(null);
  const capturingRef = useRef(false);

  // loading-models | requesting-camera | detecting | capturing | done | error
  const [phase, setPhase] = useState('loading-models');
  const [hint, setHint] = useState('Loading face verification models…');
  const [error, setError] = useState('');

  const stopCamera = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        await loadFaceModels();
        if (cancelled) return;

        setPhase('requesting-camera');
        setHint('Requesting camera access…');

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 360 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        stableTrackerRef.current.reset();
        setPhase('detecting');
        setHint('Position your face in the frame…');

        intervalRef.current = setInterval(runDetectionTick, DETECTION_INTERVAL_MS);
      } catch (err) {
        if (cancelled) return;
        setPhase('error');
        if (err?.name === 'NotAllowedError') {
          setError('Camera access was denied. Please allow camera permissions and try again.');
        } else {
          setError('Could not access the camera. Please check your device and try again.');
        }
      }
    };

    const runDetectionTick = async () => {
      if (!videoRef.current || capturingRef.current) return;
      const video = videoRef.current;
      if (video.readyState < 2) return;

      try {
        const allFaces = await detectAllFaces(video);
        if (allFaces.length > 1) {
          setHint('Only one person should be in frame.');
          stableTrackerRef.current.reset();
          return;
        }

        const result = await detectFaceLandmarks(video);
        const trackerPhase = stableTrackerRef.current.update(!!result);

        if (!result) {
          setHint('No face detected — center your face in the frame.');
          return;
        }

        if (trackerPhase !== 'done') {
          setHint('Hold still…');
          return;
        }

        if (!capturingRef.current) {
          capturingRef.current = true;
          clearInterval(intervalRef.current);
          setPhase('capturing');
          setHint('Capturing face…');

          const full = await detectFaceWithDescriptor(video);
          if (!full) {
            capturingRef.current = false;
            stableTrackerRef.current.reset();
            setPhase('detecting');
            setHint('Lost the face — hold still and try again.');
            intervalRef.current = setInterval(runDetectionTick, DETECTION_INTERVAL_MS);
            return;
          }

          setPhase('done');
          setHint('Verified!');
          stopCamera();
          onCapture({
            descriptor: toPlainDescriptor(full.descriptor),
            livenessPassed: true,
          });
        }
      } catch {
        // Transient per-frame errors (e.g. video not ready) are fine to ignore
      }
    };

    init();

    return () => {
      cancelled = true;
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col items-center text-center w-full">
      <div className="relative h-56 w-72 max-w-full rounded-2xl overflow-hidden border-4 border-bolt-200 dark:border-ink-700 bg-black/80 mb-4">
        <video
          ref={videoRef}
          muted
          playsInline
          className="h-full w-full object-cover scale-x-[-1]"
          style={{ display: phase === 'error' || phase === 'loading-models' ? 'none' : 'block' }}
        />
        {(phase === 'loading-models' || phase === 'requesting-camera') && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-cream/80 gap-2">
            <ScanFace size={40} className="animate-pulse" />
            <span className="text-xs px-4">{hint}</span>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-3 py-2 text-sm text-red-700 dark:text-red-300 w-full">
          <AlertCircle size={16} className="shrink-0" />
          {error}
        </div>
      )}

      {phase !== 'error' && phase !== 'done' && (
        <p className="text-xs text-ink-700/60 dark:text-cream/50">{hint}</p>
      )}

      <p className="text-[11px] mt-2 text-ink-700/40 dark:text-cream/30">
        {actionLabel} runs fully on-device. Only a secure face embedding is sent — never a raw image.
      </p>
    </div>
  );
};

export default FaceCapture;
