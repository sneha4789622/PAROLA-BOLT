import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone, Mail, ArrowLeft, RefreshCw, CheckCircle2 } from 'lucide-react';
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
    if (e.key === 'Backspace' && !value[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (pasted) { onChange(pasted.padEnd(OTP_LENGTH, '')); inputs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus(); }
    e.preventDefault();
  };

  return (
    <div className="flex gap-2 justify-center my-6">
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
          className={`w-11 h-13 text-center text-xl font-bold rounded-xl border-2 transition-all outline-none
            ${value[idx] ? 'border-bolt-500 bg-bolt-50 dark:bg-bolt-900/20' : 'border-bolt-200 dark:border-ink-700'}
            bg-white dark:bg-ink-800 focus:border-bolt-500 focus:ring-2 focus:ring-bolt-200 dark:focus:ring-bolt-800
            disabled:opacity-50`}
        />
      ))}
    </div>
  );
};

const OtpLoginPage = () => {
  const [step, setStep] = useState('identifier'); // 'identifier' | 'otp' | 'success'
  const [identifierType, setIdentifierType] = useState('email');
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);
  // 
const { setSessionFromTokens } = useAuth();  
const navigate = useNavigate();
  const timerRef = useRef(null);

  useEffect(() => {
    if (countdown > 0) {
      timerRef.current = setTimeout(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timerRef.current);
  }, [countdown]);

  const sendOtp = async () => {
    if (!identifier.trim()) return setError('Please enter your email or mobile number.');
    setLoading(true); setError('');
    try {
      await api.post('/auth/otp/send', { identifier: identifier.trim(), identifierType });
      setStep('otp');
      setCountdown(60);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not send OTP.');
    } finally { setLoading(false); }
  };

  const resendOtp = async () => {
    if (countdown > 0) return;
    setLoading(true); setError('');
    try {
      await api.post('/auth/otp/resend', { identifier: identifier.trim(), identifierType, purpose: 'login' });
      setCountdown(60); setOtp('');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not resend OTP.');
    } finally { setLoading(false); }
  };

  const verifyOtp = async () => {
    if (otp.length !== OTP_LENGTH) return setError('Please enter the complete 6-digit OTP.');
    setLoading(true); setError('');
    try {
      const { data } = await api.post('/auth/otp/verify-login', {
        identifier: identifier.trim(), identifierType, otp,
      });
      if (data.nextStep === 'biometric_verification') {
        navigate('/biometric-setup', { state: { mode: 'signup', pendingToken: data.pendingToken } });
        return;
      }
      setSessionFromTokens(data);

setStep("success");

setTimeout(() => {
  navigate("/dashboard");
}, 1000);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP.');
      if (err.response?.status === 429) setOtp('');
    } finally { setLoading(false); }
  };

  return (
    <AuthLayout title="Login with OTP" subtitle="Access your Parola Bolt account using a one-time verification code.">
      <AnimatePresence mode="wait">
        {step === 'identifier' && (
          <motion.div key="id" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            {/* Toggle email / mobile */}
            <div className="flex rounded-xl bg-bolt-50 dark:bg-ink-800 p-1 mb-4">
              {[{ val: 'email', icon: Mail, label: 'Email' }, { val: 'mobile', icon: Smartphone, label: 'Mobile' }].map(({ val, icon: Icon, label }) => (
                <button
                  key={val}
                  onClick={() => { setIdentifierType(val); setIdentifier(''); setError(''); }}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-display font-medium transition-colors ${
                    identifierType === val ? 'bg-white dark:bg-ink-900 shadow text-bolt-600 dark:text-bolt-300' : 'text-ink-700/60 dark:text-cream/50'
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
              placeholder={identifierType === 'email' ? 'you@example.com' : '+91 98765 43210'}
              type={identifierType === 'email' ? 'email' : 'tel'}
              className="input-field mb-3"
            />

            {error && <p className="text-sm text-red-500 mb-3">{error}</p>}

            <button onClick={sendOtp} disabled={loading} className="btn-primary w-full">
              {loading ? 'Sending OTP…' : 'Send OTP'}
            </button>

            <div className="mt-4 text-center text-sm text-ink-700/60 dark:text-cream/50">
              <Link to="/login" className="flex items-center justify-center gap-1 hover:text-bolt-500">
                <ArrowLeft size={14} /> Back to password login
              </Link>
            </div>
          </motion.div>
        )}

        {step === 'otp' && (
          <motion.div key="otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="card p-5 text-center">
              <p className="text-sm text-ink-700/70 dark:text-cream/60 mb-1">
                OTP sent to
              </p>
              <p className="font-semibold text-bolt-600 dark:text-bolt-300 mb-1">{identifier}</p>
              <p className="text-xs text-ink-700/50 dark:text-cream/40">Enter the 6-digit code below. Expires in 5 minutes.</p>

              <OtpInput value={otp} onChange={setOtp} disabled={loading} />

              {error && <p className="text-sm text-red-500 mb-3">{error}</p>}

              <button onClick={verifyOtp} disabled={loading || otp.length !== OTP_LENGTH} className="btn-primary w-full mb-3">
                {loading ? 'Verifying…' : 'Verify OTP & Login'}
              </button>

              <button
                onClick={resendOtp}
                disabled={countdown > 0 || loading}
                className="flex items-center justify-center gap-1.5 w-full text-sm text-ink-700/60 dark:text-cream/50 hover:text-bolt-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw size={13} />
                {countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
              </button>
            </div>

            <button onClick={() => { setStep('identifier'); setOtp(''); setError(''); }} className="mt-4 flex items-center gap-1 text-sm text-ink-700/60 dark:text-cream/50 hover:text-bolt-500 mx-auto">
              <ArrowLeft size={14} /> Change {identifierType}
            </button>
          </motion.div>
        )}

        {step === 'success' && (
          <motion.div key="success" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-8">
            <CheckCircle2 size={56} className="text-mint mx-auto mb-3" />
            <p className="font-display font-semibold text-lg">Verified! Redirecting…</p>
          </motion.div>
        )}
      </AnimatePresence>

      {step === 'identifier' && (
        <p className="mt-6 text-center text-sm text-ink-700/60 dark:text-cream/50">
          Don't have an account?{' '}
          <Link to="/signup" className="font-semibold text-bolt-600 dark:text-bolt-300">Sign up</Link>
        </p>
      )}
    </AuthLayout>
  );
};

export default OtpLoginPage;
