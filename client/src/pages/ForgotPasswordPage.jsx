import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Eye, EyeOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import AuthLayout from '../components/AuthLayout';
import api from '../api/axios';

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
    if (e.key === 'Backspace' && !value[idx] && idx > 0) inputs.current[idx - 1]?.focus();
  };
  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (pasted) { onChange(pasted.padEnd(OTP_LENGTH, '')); inputs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus(); }
    e.preventDefault();
  };
  return (
    <div className="flex gap-2 justify-center my-5">
      {Array.from({ length: OTP_LENGTH }).map((_, idx) => (
        <input key={idx} ref={(el) => (inputs.current[idx] = el)} type="text" inputMode="numeric" maxLength={1}
          value={value[idx] || ''} onChange={(e) => handleChange(e, idx)} onKeyDown={(e) => handleKeyDown(e, idx)}
          onPaste={handlePaste} disabled={disabled}
          className={`w-11 h-13 text-center text-xl font-bold rounded-xl border-2 transition-all outline-none
            ${value[idx] ? 'border-bolt-500 bg-bolt-50 dark:bg-bolt-900/20' : 'border-bolt-200 dark:border-ink-700'}
            bg-white dark:bg-ink-800 focus:border-bolt-500 disabled:opacity-50`}
        />
      ))}
    </div>
  );
};

const PASSWORD_RULES = [
  { label: 'At least 12 characters', test: (p) => p.length >= 12 },
  { label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'One number', test: (p) => /[0-9]/.test(p) },
  { label: 'One special character', test: (p) => /[!@#$%^&*(),.?":{}|<>_\-]/.test(p) },
];

const ForgotPasswordPage = () => {
  const [step, setStep] = useState('send'); // send | verify | reset | done
  const [identifierType, setIdentifierType] = useState('email');
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);
  const navigate = useNavigate();
  const timerRef = useRef(null);

  useEffect(() => {
    if (countdown > 0) { timerRef.current = setTimeout(() => setCountdown((c) => c - 1), 1000); }
    return () => clearTimeout(timerRef.current);
  }, [countdown]);

  const sendOtp = async () => {
    if (!identifier.trim()) return setError('Please enter your email or mobile number.');
    setLoading(true); setError('');
    try {
      await api.post('/auth/otp/forgot-password/send', { identifier: identifier.trim(), identifierType });
      setStep('verify'); setCountdown(60);
    } catch (err) { setError(err.response?.data?.message || 'Could not send OTP.'); }
    finally { setLoading(false); }
  };

  const resendOtp = async () => {
    if (countdown > 0) return;
    setLoading(true); setError('');
    try {
      await api.post('/auth/otp/resend', { identifier: identifier.trim(), identifierType, purpose: 'forgot_password' });
      setCountdown(60); setOtp('');
    } catch (err) { setError(err.response?.data?.message || 'Could not resend.'); }
    finally { setLoading(false); }
  };

  const verifyOtp = async () => {
    if (otp.length !== OTP_LENGTH) return setError('Please enter the complete 6-digit OTP.');
    setLoading(true); setError('');
    try {
      const { data } = await api.post('/auth/otp/forgot-password/verify', { identifier: identifier.trim(), identifierType, otp });
      setResetToken(data.resetToken);
      setStep('reset');
    } catch (err) { setError(err.response?.data?.message || 'Invalid OTP.'); }
    finally { setLoading(false); }
  };

  const resetPassword = async () => {
    if (!newPassword || !confirmPassword) return setError('Please fill in all fields.');
    if (newPassword !== confirmPassword) return setError('Passwords do not match.');
    setLoading(true); setError('');
    try {
      await api.post('/auth/otp/forgot-password/reset', { resetToken, newPassword, confirmPassword });
      setStep('done');
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) { setError(err.response?.data?.message || 'Could not reset password.'); }
    finally { setLoading(false); }
  };

  const stepTitles = {
    send: 'Forgot Password',
    verify: 'Enter OTP',
    reset: 'New Password',
    done: 'Password Reset!',
  };
  const stepSubs = {
    send: "Enter your email or mobile and we'll send you a reset code.",
    verify: `Enter the 6-digit code sent to ${identifier}`,
    reset: 'Choose a new strong password for your account.',
    done: 'Your password has been reset. Redirecting to login…',
  };

  return (
    <AuthLayout title={stepTitles[step]} subtitle={stepSubs[step]}>
      {/* Step indicator */}
      <div className="flex gap-2 mb-6">
        {['send', 'verify', 'reset'].map((s, i) => (
          <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${
            ['send', 'verify', 'reset', 'done'].indexOf(step) > i ? 'bg-bolt-500' :
            step === s ? 'bg-bolt-300' : 'bg-bolt-100 dark:bg-ink-700'
          }`} />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ── STEP 1: Send OTP ── */}
        {step === 'send' && (
          <motion.div key="send" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="flex rounded-xl bg-bolt-50 dark:bg-ink-800 p-1 mb-4">
              {[{ val: 'email', label: 'Email' }, { val: 'mobile', label: 'Mobile' }].map(({ val, label }) => (
                <button key={val} onClick={() => { setIdentifierType(val); setIdentifier(''); setError(''); }}
                  className={`flex-1 py-2 text-sm font-display font-medium rounded-lg transition-colors ${
                    identifierType === val ? 'bg-white dark:bg-ink-900 shadow text-bolt-600 dark:text-bolt-300' : 'text-ink-700/60 dark:text-cream/50'
                  }`}>
                  {label}
                </button>
              ))}
            </div>
            <input value={identifier} onChange={(e) => { setIdentifier(e.target.value); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && sendOtp()}
              placeholder={identifierType === 'email' ? 'you@example.com' : '+91 98765 43210'}
              className="input-field mb-3" />
            {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
            <button onClick={sendOtp} disabled={loading} className="btn-primary w-full">
              {loading ? 'Sending…' : 'Send Reset OTP'}
            </button>
          </motion.div>
        )}

        {/* ── STEP 2: Verify OTP ── */}
        {step === 'verify' && (
          <motion.div key="verify" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <OtpInput value={otp} onChange={setOtp} disabled={loading} />
            {error && <p className="text-sm text-red-500 mb-3 text-center">{error}</p>}
            <button onClick={verifyOtp} disabled={loading || otp.length !== OTP_LENGTH} className="btn-primary w-full mb-3">
              {loading ? 'Verifying…' : 'Verify OTP'}
            </button>
            <button onClick={resendOtp} disabled={countdown > 0 || loading}
              className="flex items-center justify-center gap-1.5 w-full text-sm text-ink-700/60 dark:text-cream/50 hover:text-bolt-500 disabled:opacity-50">
              <RefreshCw size={13} />{countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
            </button>
            <button onClick={() => { setStep('send'); setOtp(''); setError(''); }}
              className="mt-3 flex items-center gap-1 text-sm text-ink-700/60 dark:text-cream/50 mx-auto hover:text-bolt-500">
              <ArrowLeft size={14} /> Change {identifierType}
            </button>
          </motion.div>
        )}

        {/* ── STEP 3: New Password ── */}
        {step === 'reset' && (
          <motion.div key="reset" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
                placeholder="New password" className="input-field pr-10" />
              <button type="button" onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-700/50 dark:text-cream/40">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {newPassword && (
              <ul className="grid grid-cols-2 gap-1 text-xs">
                {PASSWORD_RULES.map((r) => (
                  <li key={r.label} className={r.test(newPassword) ? 'text-mint' : 'text-ink-700/40 dark:text-cream/30'}>
                    {r.test(newPassword) ? '✓' : '•'} {r.label}
                  </li>
                ))}
              </ul>
            )}
            <input type={showPassword ? 'text' : 'password'} value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
              placeholder="Confirm new password" className="input-field" />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button onClick={resetPassword} disabled={loading} className="btn-primary w-full">
              {loading ? 'Resetting…' : 'Reset Password'}
            </button>
          </motion.div>
        )}

        {/* ── DONE ── */}
        {step === 'done' && (
          <motion.div key="done" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-8">
            <CheckCircle2 size={56} className="text-mint mx-auto mb-3" />
            <p className="font-display font-semibold text-lg text-mint">Password reset successfully!</p>
            <p className="text-sm text-ink-700/60 dark:text-cream/50 mt-1">Redirecting to login…</p>
          </motion.div>
        )}
      </AnimatePresence>

      {step !== 'done' && (
        <p className="mt-6 text-center text-sm text-ink-700/60 dark:text-cream/50">
          Remember your password?{' '}
          <Link to="/login" className="font-semibold text-bolt-600 dark:text-bolt-300">Log in</Link>
        </p>
      )}
    </AuthLayout>
  );
};

export default ForgotPasswordPage;
