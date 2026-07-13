import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, CheckCircle2, XCircle, Clock, ShieldCheck, LogOut } from 'lucide-react';
import AuthLayout from '../components/AuthLayout';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const MAX_FILE_MB = 8;

const AadhaarVerificationPage = () => {
  const navigate = useNavigate();
  const { user, refreshUser, logout } = useAuth();

  const [frontFile, setFrontFile] = useState(null);
  const [backFile, setBackFile] = useState(null);
  const [frontPreview, setFrontPreview] = useState('');
  const [backPreview, setBackPreview] = useState('');
  const [phase, setPhase] = useState('checking'); // checking | form | submitting | verified | rejected | pending
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const frontInputRef = useRef(null);
  const backInputRef = useRef(null);

  // If already verified, skip straight to dashboard. If already rejected
  // or pending from a prior submission, show that state immediately.
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const { data } = await api.get('/verification/aadhaar/status');
        if (data.aadhaarVerified) {
          navigate('/dashboard', { replace: true });
          return;
        }
        if (data.verificationStatus === 'rejected') {
          setMessage(data.rejectionReason || 'Your verification was rejected.');
          setPhase('rejected');
          return;
        }
        if (data.verificationStatus === 'pending') {
          setPhase('pending');
          return;
        }
        setPhase('form');
      } catch {
        setPhase('form');
      }
    };
    checkStatus();
  }, [navigate]);

  const handleFile = (e, side) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
      setError('Only JPG or PNG images are allowed.');
      return;
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setError(`Each image must be under ${MAX_FILE_MB}MB.`);
      return;
    }
    setError('');
    const preview = URL.createObjectURL(file);
    if (side === 'front') {
      setFrontFile(file);
      setFrontPreview(preview);
    } else {
      setBackFile(file);
      setBackPreview(preview);
    }
  };

  const submit = async () => {
    if (!frontFile || !backFile) {
      setError('Please upload both the front and back of your Aadhaar card.');
      return;
    }
    setPhase('submitting');
    setError('');

    try {
      const formData = new FormData();
      formData.append('aadhaarFront', frontFile);
      formData.append('aadhaarBack', backFile);

      const { data } = await api.post('/verification/aadhaar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (data.status === 'verified') {
        await refreshUser();
        setPhase('verified');
        setTimeout(() => navigate('/dashboard', { replace: true }), 1200);
      } else if (data.status === 'pending') {
        setMessage(data.message);
        setPhase('pending');
      }
    } catch (err) {
      const data = err.response?.data;
      if (data?.status === 'rejected') {
        setMessage(data.message);
        setPhase('rejected');
      } else {
        setError(data?.message || 'Could not submit your Aadhaar for verification. Please try again.');
        setPhase('form');
      }
    }
  };

  const retry = () => {
    setFrontFile(null);
    setBackFile(null);
    setFrontPreview('');
    setBackPreview('');
    setError('');
    setPhase('form');
  };

  return (
    <AuthLayout
      title="Aadhaar identity verification"
      subtitle="One last step — verify your identity and confirm you're 18 or older to finish setting up your account."
    >
      <div className="card p-8">
        <AnimatePresence mode="wait">
          {phase === 'checking' && (
            <motion.div key="checking" className="flex flex-col items-center gap-3 py-10">
              <div className="h-12 w-12 rounded-full border-4 border-bolt-300 border-t-transparent animate-spin" />
              <p className="text-sm text-ink-700/60 dark:text-cream/50">Checking verification status…</p>
            </motion.div>
          )}

          {phase === 'verified' && (
            <motion.div key="verified" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center gap-3 py-10">
              <div className="h-24 w-24 rounded-full border-4 border-mint flex items-center justify-center bg-mint/10">
                <CheckCircle2 size={48} className="text-mint" />
              </div>
              <p className="font-display font-semibold text-mint">Identity verified! Redirecting…</p>
            </motion.div>
          )}

          {phase === 'rejected' && (
            <motion.div key="rejected" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3 py-10 text-center">
              <div className="h-24 w-24 rounded-full border-4 border-red-300 flex items-center justify-center bg-red-50 dark:bg-red-900/20">
                <XCircle size={48} className="text-red-500" />
              </div>
              <p className="text-sm text-red-600 dark:text-red-300 max-w-xs">{message}</p>
              <button onClick={logout} className="btn-secondary text-sm mt-2 flex items-center gap-1.5">
                <LogOut size={14} /> Log out
              </button>
            </motion.div>
          )}

          {phase === 'pending' && (
            <motion.div key="pending" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3 py-10 text-center">
              <div className="h-24 w-24 rounded-full border-4 border-amber flex items-center justify-center bg-amber/10">
                <Clock size={48} className="text-amber-dark dark:text-amber" />
              </div>
              <p className="font-display font-semibold">Under review</p>
              <p className="text-sm text-ink-700/60 dark:text-cream/50 max-w-xs">
                {message || 'Your Aadhaar documents are being manually reviewed by our team. This usually takes a short while.'}
              </p>
              <button onClick={logout} className="btn-secondary text-sm mt-2 flex items-center gap-1.5">
                <LogOut size={14} /> Log out
              </button>
            </motion.div>
          )}

          {(phase === 'form' || phase === 'submitting') && (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <button
                  onClick={() => frontInputRef.current?.click()}
                  disabled={phase === 'submitting'}
                  className="border-2 border-dashed border-bolt-200 dark:border-ink-700 rounded-xl h-32 flex flex-col items-center justify-center gap-1.5 overflow-hidden hover:border-bolt-400 transition-colors"
                >
                  {frontPreview ? (
                    <img src={frontPreview} alt="Aadhaar front" className="h-full w-full object-cover" />
                  ) : (
                    <>
                      <UploadCloud size={22} className="text-ink-700/40 dark:text-cream/30" />
                      <span className="text-xs text-ink-700/50 dark:text-cream/40">Aadhaar Front</span>
                    </>
                  )}
                </button>
                <input ref={frontInputRef} type="file" accept="image/jpeg,image/png" hidden onChange={(e) => handleFile(e, 'front')} />

                <button
                  onClick={() => backInputRef.current?.click()}
                  disabled={phase === 'submitting'}
                  className="border-2 border-dashed border-bolt-200 dark:border-ink-700 rounded-xl h-32 flex flex-col items-center justify-center gap-1.5 overflow-hidden hover:border-bolt-400 transition-colors"
                >
                  {backPreview ? (
                    <img src={backPreview} alt="Aadhaar back" className="h-full w-full object-cover" />
                  ) : (
                    <>
                      <UploadCloud size={22} className="text-ink-700/40 dark:text-cream/30" />
                      <span className="text-xs text-ink-700/50 dark:text-cream/40">Aadhaar Back</span>
                    </>
                  )}
                </button>
                <input ref={backInputRef} type="file" accept="image/jpeg,image/png" hidden onChange={(e) => handleFile(e, 'back')} />
              </div>

              {error && (
                <div className="mb-3 rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-3 py-2 text-sm text-red-700 dark:text-red-300">
                  {error}
                </div>
              )}

              <button onClick={submit} disabled={phase === 'submitting'} className="btn-primary w-full flex items-center justify-center gap-2">
                {phase === 'submitting' ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-white/50 border-t-white animate-spin" />
                    Verifying…
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} /> Submit for verification
                  </>
                )}
              </button>

              <p className="text-[11px] mt-3 text-center text-ink-700/40 dark:text-cream/30">
                Your Aadhaar number is encrypted and never shown in full — only the last 4 digits are ever displayed.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AuthLayout>
  );
};

export default AadhaarVerificationPage;
