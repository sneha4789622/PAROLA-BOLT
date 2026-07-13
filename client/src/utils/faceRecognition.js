/**
 * Real, on-device face detection + recognition + liveness helpers,
 * built on face-api.js (a TensorFlow.js wrapper). Nothing here ever
 * uploads a raw image — only a 128-length numeric face descriptor
 * (an embedding) leaves the browser.
 *
 * Models are fetched once from a public CDN and cached by the browser.
 * For a production deployment you'd self-host these under /public/models
 * instead, but a CDN is the simplest path for local/dev/demo use.
 */
import * as faceapi from 'face-api.js';

const MODEL_URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights';

let modelsLoaded = false;
let loadingPromise = null;

export const loadFaceModels = () => {
  if (modelsLoaded) return Promise.resolve();
  if (loadingPromise) return loadingPromise;

  loadingPromise = Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]).then(() => {
    modelsLoaded = true;
  });

  return loadingPromise;
};

export const areModelsLoaded = () => modelsLoaded;

const detectorOptions = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });

/**
 * Lightweight per-frame detection: face box + 68 landmarks only.
 * Cheap enough to run several times a second for the liveness check.
 */
export const detectFaceLandmarks = async (videoEl) => {
  return faceapi.detectSingleFace(videoEl, detectorOptions).withFaceLandmarks();
};

/**
 * Full detection including the 128-d recognition descriptor. Heavier —
 * only call this once, at the moment of capture.
 */
export const detectFaceWithDescriptor = async (videoEl) => {
  return faceapi.detectSingleFace(videoEl, detectorOptions).withFaceLandmarks().withFaceDescriptor();
};

/** Counts all faces in frame — used to reject "more than one person" captures. */
export const detectAllFaces = async (videoEl) => {
  return faceapi.detectAllFaces(videoEl, detectorOptions);
};

/**
 * Eye Aspect Ratio (Soukupová & Čech). Falls below ~0.20-0.24 during a
 * blink and recovers above ~0.27 with eyes open. Using face-api.js's
 * 68-point eye landmark groups (6 points per eye).
 */
const eyeAspectRatio = (eye) => {
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const vertical1 = dist(eye[1], eye[5]);
  const vertical2 = dist(eye[2], eye[4]);
  const horizontal = dist(eye[0], eye[3]);
  if (horizontal === 0) return 0;
  return (vertical1 + vertical2) / (2 * horizontal);
};

export const averageEyeAspectRatio = (landmarks) => {
  const leftEAR = eyeAspectRatio(landmarks.getLeftEye());
  const rightEAR = eyeAspectRatio(landmarks.getRightEye());
  return (leftEAR + rightEAR) / 2;
};

// How many consecutive detection ticks a face must be steadily present
// for before we treat the capture as ready (a quick "hold still" beat
// rather than a multi-second eyes close/open challenge).
const STABLE_FRAMES_REQUIRED = 6; // ~1 second at DETECTION_INTERVAL_MS=180ms

/**
 * Quick liveness check: just requires the same face to be steadily
 * detected for about a second before capturing — no close/open eyes
 * challenge. Feed it `true`/`false` (face detected this frame) via
 * update(); read .phase for the current step.
 */
export const createStableFaceTracker = () => {
  let phase = 'detecting'; // 'detecting' | 'done'
  let stableStreak = 0;

  return {
    /** @param {boolean} faceDetected whether a single face was found this frame */
    update(faceDetected) {
      if (phase === 'done') return phase;

      stableStreak = faceDetected ? stableStreak + 1 : 0;
      if (stableStreak >= STABLE_FRAMES_REQUIRED) {
        phase = 'done';
      }
      return phase;
    },
    get phase() {
      return phase;
    },
    get isDone() {
      return phase === 'done';
    },
    reset() {
      phase = 'detecting';
      stableStreak = 0;
    },
  };
};

export const toPlainDescriptor = (float32Descriptor) => Array.from(float32Descriptor);
