import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ScanFace, CheckCircle2, AlertCircle, Fingerprint } from 'lucide-react';
import AuthLayout from '../components/AuthLayout';
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

const BiometricPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { completeBiometricSignup, biometricLogin } = useAuth();
  const mode = location.state?.mode || 'signup'; // 'signup' | 'login'

  const [status, setStatus] = useState('idle'); // idle | scanning | success | error
  const [error, setError] = useState('');

  const handleScan = async () => {
    setStatus('scanning');
    setError('');

    // Simulate a 2-second on-device Face ID capture
    await new Promise((r) => setTimeout(r, 2000));

    // Mock face capture token. In production this comes from the
    // device's secure biometric API (Face ID / fingerprint sensor).
    const faceCaptureToken =
      mode === 'login'
        ? localStorage.getItem('pb_mock_face_token') || 'no-face-token-registered'
        : `face-${crypto.randomUUID()}`;

    try {
      if (mode === 'signup') {
        await completeBiometricSignup(faceCaptureToken, getDeviceFingerprint());
        localStorage.setItem('pb_mock_face_token', faceCaptureToken);
        setStatus('success');
        setTimeout(() => navigate('/dashboard'), 1200);
      } else {
        await biometricLogin(faceCaptureToken);
        setStatus('success');
        setTimeout(() => navigate('/dashboard'), 1200);
      }
    } catch (err) {
      setStatus('error');
      setError(err.response?.data?.message || 'Biometric verification failed. Please try again.');
    }
  };

  return (
    <AuthLayout
      title={mode === 'signup' ? 'One-time biometric verification' : 'Face ID login'}
      subtitle={
        mode === 'signup'
          ? 'This one-time step links a secure biometric identity to your account to prevent duplicate or fake accounts.'
          : 'Use your registered Face ID to sign in instantly.'
      }
    >
      <div className="card p-8 flex flex-col items-center text-center">
        <div className="relative h-40 w-40 flex items-center justify-center mb-6">
          <AnimatePresence mode="wait">
            {status !== 'success' ? (
              <motion.div
                key="face"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative h-full w-full rounded-full border-4 border-bolt-200 dark:border-ink-700 flex items-center justify-center"
              >
                <ScanFace size={64} className="text-bolt-500" />
                {status === 'scanning' && (
                  <motion.div
                    className="absolute inset-0 rounded-full border-4 border-amber"
                    initial={{ opacity: 0.6, scale: 1 }}
                    animate={{ opacity: 0, scale: 1.25 }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
                  />
                )}
              </motion.div>
            ) : (
              <motion.div
                key="success"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="h-full w-full rounded-full border-4 border-mint flex items-center justify-center bg-mint/10"
              >
                <CheckCircle2 size={64} className="text-mint" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-3 py-2 text-sm text-red-700 dark:text-red-300">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {status === 'success' ? (
          <p className="font-display font-semibold text-mint">Verified! Redirecting…</p>
        ) : (
          <>
            <button onClick={handleScan} disabled={status === 'scanning'} className="btn-primary w-full mb-3">
              <Fingerprint size={18} />
              {status === 'scanning'
                ? 'Scanning…'
                : mode === 'signup'
                ? 'Start biometric verification'
                : 'Scan Face ID to log in'}
            </button>
            <p className="text-xs text-ink-700/50 dark:text-cream/40">
              Parola Bolt never stores raw biometric images — only a secure, one-way verification reference tied
              to this device.
            </p>
          </>
        )}
      </div>
    </AuthLayout>
  );
};

export default BiometricPage;
