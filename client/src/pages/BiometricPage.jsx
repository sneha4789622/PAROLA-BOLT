import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, ShieldAlert } from 'lucide-react';
import AuthLayout from '../components/AuthLayout';
import FaceCapture from '../components/FaceCapture';
import { useAuth } from '../context/AuthContext';

// Generates a simple device fingerprint from available browser signals.
// In a production app, this would use a dedicated device-fingerprint library.
const getDeviceFingerprint = () => {
  const signals = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    new Date().getTimezoneOffset(),
  ].join('|');

  let hash = 0;
  for (let i = 0; i < signals.length; i++) {
    hash = (hash << 5) - hash + signals.charCodeAt(i);
    hash |= 0;
  }
  return `device-${Math.abs(hash)}`;
};

const COPY = {
  signup: {
    title: 'One-time biometric verification',
    subtitle:
      'This one-time step links your face to your account to prevent duplicate or fake accounts. Look at the camera and hold still for a second.',
  },
  verify: {
    title: 'Face ID verification',
    subtitle: 'Your password checked out — now confirm it\u2019s really you with a quick face scan.',
  },
  login: {
    title: 'Face ID login',
    subtitle: 'Use your registered face to sign in instantly — no password needed.',
  },
};

const BiometricPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { completeBiometricSignup, verifyFaceLogin, biometricLogin } = useAuth();
  const mode = location.state?.mode || 'signup'; // 'signup' | 'verify' | 'login'

  const [status, setStatus] = useState('capturing'); // capturing | submitting | success | error | locked
  const [error, setError] = useState('');
  const [attemptsRemaining, setAttemptsRemaining] = useState(null);
  const [key, setKey] = useState(0); // remount FaceCapture to retry

  const handleCapture = async ({ descriptor, livenessPassed }) => {
    setStatus('submitting');
    setError('');

    try {
      if (mode === 'signup') {
        await completeBiometricSignup(descriptor, livenessPassed, getDeviceFingerprint());
      } else if (mode === 'verify') {
        await verifyFaceLogin(descriptor);
      } else {
        await biometricLogin(descriptor);
      }
      setStatus('success');
      setTimeout(() => navigate('/dashboard'), 1000);
    } catch (err) {
      const data = err.response?.data;
      const message = data?.message || 'Face verification failed. Please try again.';

      if (err.response?.status === 403 && /minute/i.test(message)) {
        setStatus('locked');
        setError(message);
      } else {
        setStatus('error');
        setError(message);
        if (typeof data?.attemptsRemaining === 'number') {
          setAttemptsRemaining(data.attemptsRemaining);
        }
      }
    }
  };

  const retry = () => {
    setStatus('capturing');
    setError('');
    setKey((k) => k + 1);
  };

  const copy = COPY[mode] || COPY.signup;

  return (
    <AuthLayout title={copy.title} subtitle={copy.subtitle}>
      <div className="card p-8 flex flex-col items-center text-center">
        <AnimatePresence mode="wait">
          {status === 'success' ? (
            <motion.div
              key="success"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center gap-3 py-8"
            >
              <div className="h-24 w-24 rounded-full border-4 border-mint flex items-center justify-center bg-mint/10">
                <CheckCircle2 size={48} className="text-mint" />
              </div>
              <p className="font-display font-semibold text-mint">Verified! Redirecting…</p>
            </motion.div>
          ) : status === 'locked' ? (
            <motion.div
              key="locked"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-3 py-8"
            >
              <div className="h-24 w-24 rounded-full border-4 border-red-300 flex items-center justify-center bg-red-50 dark:bg-red-900/20">
                <ShieldAlert size={48} className="text-red-500" />
              </div>
              <p className="text-sm text-red-600 dark:text-red-300 max-w-xs">{error}</p>
              <button onClick={() => navigate('/login')} className="btn-secondary text-sm mt-2">
                Back to login
              </button>
            </motion.div>
          ) : (
            <motion.div key="capture" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full">
              {status !== 'submitting' && <FaceCapture key={key} onCapture={handleCapture} />}
              {status === 'submitting' && (
                <div className="flex flex-col items-center gap-3 py-8">
                  <div className="h-16 w-16 rounded-full border-4 border-bolt-300 border-t-transparent animate-spin" />
                  <p className="text-sm text-ink-700/60 dark:text-cream/50">Verifying face…</p>
                </div>
              )}

              {error && status === 'error' && (
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-3 py-2 text-sm text-red-700 dark:text-red-300 text-left">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <span>
                    {error}
                    {attemptsRemaining !== null && (
                      <span className="block text-xs opacity-75 mt-1">
                        {attemptsRemaining} attempt{attemptsRemaining === 1 ? '' : 's'} remaining before lockout.
                      </span>
                    )}
                  </span>
                </div>
              )}

              {status === 'error' && (
                <button onClick={retry} className="btn-primary w-full mt-4">
                  Try again
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AuthLayout>
  );
};

export default BiometricPage;
