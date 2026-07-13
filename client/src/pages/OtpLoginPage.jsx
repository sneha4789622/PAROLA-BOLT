import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone, Mail, ArrowLeft, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import AuthLayout from '../components/AuthLayout';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const OTP_LENGTH = 6;

const OtpInput = ({ value, onChange, disabled }) => {
  const inputs = useRef([]);

  const handleChange = (e, idx) => {
    const val = e.target.value.replace(/\D/g, '').slice(-1);
    const chars = value.split('');
    chars[idx] = val;
    onChange(chars.join(''));
    if (val && idx < OTP_LENGTH - 1) inputs.current[idx + 1]?.focus();
  };

  const handleKeyDown = (e, idx) => {
    if (e.key === 'Backspace' && !value[idx] && idx > 0)
      inputs.current[idx - 1]?.focus();
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (pasted) {
      onChange(pasted.padEnd(OTP_LENGTH, ''));
      inputs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
    }
    e.preventDefault();
  };

  return (
    <div className="flex gap-2 justify-center my-4">
      {Array.from({ length: OTP_LENGTH }).map((_, idx) => (
        <input
          key={idx}
          ref={(el) => (inputs.current[idx] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[idx] || ''}
          onChange={(e) => handleChange(e, idx)}
          onKeyDown={(e) => handleKeyDown(e, idx)}
          onPaste={handlePaste}
          disabled={disabled}
          className={`w-11 h-14 text-center text-2xl font-bold rounded-xl border-2 transition-all outline-none
            ${value[idx]
              ? 'border-bolt-500 bg-bolt-50 dark:bg-bolt-900/20 text-bolt-700 dark:text-bolt-200'
              : 'border-bolt-200 dark:border-ink-700 bg-white dark:bg-ink-800'}
            focus:border-bolt-500 focus:ring-2 focus:ring-bolt-200 dark:focus:ring-bolt-800
            disabled:opacity-50`}
        />
      ))}
    </div>
  );
};

const OtpLoginPage = () => {
  const [step, setStep] = useState('identifier');
  const [identifierType, setIdentifierType] = useState('email');
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);
  const navigate = useNavigate();
  const { setSessionFromTokens } = useAuth();
  const timerRef = useRef(null);

  useEffect(() => {
    if (countdown > 0) {
      timerRef.current = setTimeout(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timerRef.current);
  }, [countdown]);

  const sendOtp = async () => {
    if (!identifier.trim()) return setError('Please enter your email or mobile number.');

    if (identifierType === 'mobile') {
      const digitCount = identifier.replace(/\D/g, '').length;
      if (digitCount < 7) {
        return setError('Please enter a valid mobile number with country code (e.g. +1 234 567 8900).');
      }
    } else if (identifierType === 'email') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier.trim())) {
        return setError('Please enter a valid email address.');
      }
    }

    setLoading(true);
    setError('');
    setDevOtp(null);
    try {
      const { data } = await api.post('/auth/otp/send', {
        identifier: identifier.trim(),
        identifierType,
      });
      setStep('otp');
      setCountdown(60);
      if (data.devOtp) {
        setDevOtp(data.devOtp);
        setOtp(data.devOtp);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    if (countdown > 0) return;
    setLoading(true);
    setError('');
    setDevOtp(null);
    try {
      const { data } = await api.post('/auth/otp/resend', {
        identifier: identifier.trim(),
        identifierType,
        purpose: 'login',
      });
      setOtp('');
      setCountdown(60);
      if (data.devOtp) {
        setDevOtp(data.devOtp);
        setOtp(data.devOtp);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not resend OTP. Please wait and try again.');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    const cleanOtp = otp.replace(/\D/g, '');
    if (cleanOtp.length !== OTP_LENGTH) return setError('Please enter the complete 6-digit OTP.');
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/otp/verify-login', {
        identifier: identifier.trim(),
        identifierType,
        otp: cleanOtp,
      });
      if (data.nextStep === 'biometric_verification') {
        navigate('/biometric-setup', { state: { mode: 'signup', pendingToken: data.pendingToken } });
        return;
      }
      // Update AuthContext so ProtectedRoute sees the user immediately
      setSessionFromTokens(data);
      setStep('success');
      setTimeout(() => navigate('/dashboard', { replace: true }), 1000);
    } catch (err) {
      setError(err.response?.data?.message || 'Incorrect OTP or it has expired.');
      if (err.response?.status === 429) setOtp('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Login with OTP"
      subtitle="No password needed — get a one-time code sent to your email or mobile."
    >
      <AnimatePresence mode="wait">

        {/* ── Step 1: Enter identifier ── */}
        {step === 'identifier' && (
          <motion.div
            key="id"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {/* Email / Mobile toggle */}
            <div className="flex rounded-xl bg-bolt-50 dark:bg-ink-800 p-1 mb-4">
              {[
                { val: 'email', icon: Mail, label: 'Email' },
                { val: 'mobile', icon: Smartphone, label: 'Mobile' },
              ].map(({ val, icon: Icon, label }) => (
                <button
                  key={val}
                  onClick={() => { setIdentifierType(val); setIdentifier(''); setError(''); }}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-display font-medium transition-colors ${
                    identifierType === val
                      ? 'bg-white dark:bg-ink-900 shadow text-bolt-600 dark:text-bolt-300'
                      : 'text-ink-700/60 dark:text-cream/50'
                  }`}
                >
                  <Icon size={15} /> {label}
                </button>
              ))}
            </div>

            <input
              value={identifier}
              onChange={(e) => { setIdentifier(e.target.value); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && sendOtp()}
              placeholder={identifierType === 'email' ? 'you@example.com' : '+1 234 567 8900'}
              type={identifierType === 'email' ? 'email' : 'tel'}
              className="input-field mb-1.5"
              autoFocus
            />
            {identifierType === 'mobile' && (
              <p className="text-xs text-ink-700/40 dark:text-cream/30 mb-3">
                Include your country code (e.g. +91 98765 43210). Spaces and dashes are accepted.
              </p>
            )}
            {identifierType === 'email' && <div className="mb-3" />}

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-500 mb-3">
                <AlertCircle size={14} /> {error}
              </div>
            )}

            <button
              onClick={sendOtp}
              disabled={loading || !identifier.trim()}
              className="btn-primary w-full"
            >
              {loading ? 'Sending OTP…' : 'Send OTP'}
            </button>

            <Link
              to="/login"
              className="mt-4 flex items-center justify-center gap-1.5 text-sm text-ink-700/60 dark:text-cream/50 hover:text-bolt-500"
            >
              <ArrowLeft size={14} /> Back to password login
            </Link>
          </motion.div>
        )}

        {/* ── Step 2: Enter OTP ── */}
        {step === 'otp' && (
          <motion.div
            key="otp"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {/* Dev Mode OTP Banner */}
            {devOtp && (
              <div className="mb-4 rounded-2xl border-2 border-amber bg-amber/10 p-4 text-center">
                <p className="text-xs font-semibold text-amber-dark dark:text-amber uppercase tracking-wider mb-1">
                  ⚠️ Development Mode — No Email/SMS Configured
                </p>
                <p className="text-xs text-ink-700/60 dark:text-cream/50 mb-2">
                  Your OTP is shown below (auto-filled for convenience):
                </p>
                <div className="flex items-center justify-center bg-white dark:bg-ink-900 rounded-xl py-3 px-4">
                  <span className="font-mono text-4xl font-black tracking-[0.3em] text-bolt-600 dark:text-bolt-300 select-all">
                    {devOtp}
                  </span>
                </div>
                <p className="text-[10px] text-ink-700/40 dark:text-cream/30 mt-2">
                  Set EMAIL_USER + EMAIL_PASS in .env for real email delivery
                </p>
              </div>
            )}

            <div className="card p-4">
              <p className="text-sm text-center text-ink-700/70 dark:text-cream/60">
                OTP sent to
              </p>
              <p className="font-semibold text-center text-bolt-600 dark:text-bolt-300 mt-0.5 mb-1">
                {identifier}
              </p>
              <p className="text-xs text-center text-ink-700/50 dark:text-cream/40">
                Enter the 6-digit code below — expires in 5 minutes
              </p>

              <OtpInput value={otp} onChange={setOtp} disabled={loading} />

              {error && (
                <div className="flex items-center justify-center gap-2 text-sm text-red-500 mb-3">
                  <AlertCircle size={14} /> {error}
                </div>
              )}

              <button
                onClick={verifyOtp}
                disabled={loading || otp.replace(/\D/g, '').length !== OTP_LENGTH}
                className="btn-primary w-full mb-3"
              >
                {loading ? 'Verifying…' : 'Verify & Login'}
              </button>

              <button
                onClick={resendOtp}
                disabled={countdown > 0 || loading}
                className="flex items-center justify-center gap-1.5 w-full text-sm text-ink-700/60 dark:text-cream/50 hover:text-bolt-500 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                {countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
              </button>
            </div>

            <button
              onClick={() => { setStep('identifier'); setOtp(''); setError(''); setDevOtp(null); }}
              className="mt-4 flex items-center gap-1 text-sm text-ink-700/60 dark:text-cream/50 hover:text-bolt-500 mx-auto"
            >
              <ArrowLeft size={14} /> Change {identifierType}
            </button>
          </motion.div>
        )}

        {/* ── Success ── */}
        {step === 'success' && (
          <motion.div
            key="success"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center py-10"
          >
            <CheckCircle2 size={60} className="text-mint mx-auto mb-3" />
            <p className="font-display font-bold text-lg text-mint">
              Verified! Redirecting to dashboard…
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {step === 'identifier' && (
        <p className="mt-6 text-center text-sm text-ink-700/60 dark:text-cream/50">
          Don't have an account?{' '}
          <Link to="/signup" className="font-semibold text-bolt-600 dark:text-bolt-300">
            Sign up
          </Link>
        </p>
      )}
    </AuthLayout>
  );
};

export default OtpLoginPage;
