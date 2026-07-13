// import { useState } from 'react';
// import { useNavigate, Link } from 'react-router-dom';
// import { Eye, EyeOff, AlertCircle, ScanFace, Hash } from 'lucide-react';
// import AuthLayout from '../components/AuthLayout';
// import { useAuth } from '../context/AuthContext';

// const LoginPage = () => {
//   const [identifier, setIdentifier] = useState('');
//   const [password, setPassword] = useState('');
//   const [showPassword, setShowPassword] = useState(false);
//   const [error, setError] = useState('');
//   const [loading, setLoading] = useState(false);
//   const { login } = useAuth();
//   const navigate = useNavigate();

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setError('');
//     setLoading(true);
//     try {
//       const data = await login(identifier, password);
//       if (data.nextStep === 'biometric_verification') {
//         navigate('/biometric-setup', { state: { mode: 'signup' } });
//       } else {
//         navigate('/dashboard');
//       }
//     } catch (err) {
//       setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <AuthLayout title="Welcome back" subtitle="Log in to continue to Parola Bolt.">
//       <form onSubmit={handleSubmit} className="space-y-4">
//         {error && (
//           <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-300">
//             <AlertCircle size={16} className="mt-0.5 shrink-0" /> {error}
//           </div>
//         )}

//         <div>
//           <label className="block text-sm font-medium mb-1.5">Email, username, or mobile number</label>
//           <input value={identifier} onChange={(e) => setIdentifier(e.target.value)}
//             required placeholder="you@example.com" className="input-field" />
//         </div>

//         <div>
//           <div className="flex items-center justify-between mb-1.5">
//             <label className="text-sm font-medium">Password</label>
            
//           </div>
          
//           <div className="relative">
//             <input type={showPassword ? 'text' : 'password'} value={password}
//               onChange={(e) => setPassword(e.target.value)} required
//               placeholder="Your password" className="input-field pr-10" />
//               <Link to="/forgot-password" className="text-md text-bolt-500 hover:underline font-medium block text-right mt-2 ">
//               Forgot Password?
//             </Link>
//             <button type="button" onClick={() => setShowPassword((s) => !s)}
//               className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-700/50 dark:text-cream/40">
//               {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
//             </button>
//           </div>
//         </div>

//         <button type="submit" disabled={loading} className="btn-primary w-full">
//           {loading ? 'Logging in…' : 'Log in'}
//         </button>

//         <div className="flex items-center gap-3">
//           <div className="h-px flex-1 bg-bolt-100 dark:bg-ink-700" />
//           <span className="text-xs text-ink-700/40 dark:text-cream/30">or</span>
//           <div className="h-px flex-1 bg-bolt-100 dark:bg-ink-700" />
//         </div>

//         <div className="grid grid-cols-2 gap-2">
//           <button type="button" onClick={() => navigate('/biometric-setup', { state: { mode: 'login' } })} className="btn-secondary text-sm">
//             <ScanFace size={16} /> Face ID
//           </button>
//           <button type="button" onClick={() => navigate('/otp-login')} className="btn-secondary text-sm">
//             <Hash size={16} /> OTP Login
//           </button>
//         </div>
//       </form>

//       <p className="mt-6 text-center text-sm text-ink-700/60 dark:text-cream/50">
//         New to Parola Bolt?{' '}
//         <Link to="/signup" className="font-semibold text-bolt-600 dark:text-bolt-300">Create an account</Link>
//       </p>
//     </AuthLayout>
//   );
// };

// export default LoginPage;

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, ScanFace, Hash } from 'lucide-react';
import AuthLayout from '../components/AuthLayout';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(identifier, password);
      if (data.nextStep === 'biometric_verification') {
        navigate('/biometric-setup', { state: { mode: 'signup' } });
      } else if (data.nextStep === 'face_verification') {
        navigate('/biometric-setup', { state: { mode: 'verify' } });
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Log in to continue to Parola Bolt.">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-300">
            <AlertCircle size={16} className="mt-0.5 shrink-0" /> {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1.5">Email, username, or mobile number</label>
          <input value={identifier} onChange={(e) => setIdentifier(e.target.value)}
            required placeholder="you@example.com" className="input-field" />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium">Password</label>
            
          </div>
          
          <div className="relative">
            <input type={showPassword ? 'text' : 'password'} value={password}
              onChange={(e) => setPassword(e.target.value)} required
              placeholder="Your password" className="input-field pr-10" />
              <Link to="/forgot-password" className="text-md text-bolt-500 hover:underline font-medium block text-right mt-2 ">
              Forgot Password?
            </Link>
            <button type="button" onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-700/50 dark:text-cream/40">
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Logging in…' : 'Log in'}
        </button>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-bolt-100 dark:bg-ink-700" />
          <span className="text-xs text-ink-700/40 dark:text-cream/30">or</span>
          <div className="h-px flex-1 bg-bolt-100 dark:bg-ink-700" />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => navigate('/biometric-setup', { state: { mode: 'login' } })} className="btn-secondary text-sm">
            <ScanFace size={16} /> Face ID
          </button>
          <button type="button" onClick={() => navigate('/otp-login')} className="btn-secondary text-sm">
            <Hash size={16} /> OTP Login
          </button>
        </div>
      </form>

      <p className="mt-6 text-center text-sm text-ink-700/60 dark:text-cream/50">
        New to Parola Bolt?{' '}
        <Link to="/signup" className="font-semibold text-bolt-600 dark:text-bolt-300">Create an account</Link>
      </p>
    </AuthLayout>
  );
};

export default LoginPage;
