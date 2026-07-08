import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import AuthLayout from '../components/AuthLayout';
import { useAuth } from '../context/AuthContext';

const initialForm = {
  fullName: '',
  username: '',
  email: '',
  mobileNumber: '',
  dateOfBirth: '',
  password: '',
  confirmPassword: '',
};

const PASSWORD_RULES = [
  { label: 'At least 12 characters', test: (p) => p.length >= 12 },
  { label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'One number', test: (p) => /[0-9]/.test(p) },
  { label: 'One special character', test: (p) => /[!@#$%^&*(),.?":{}|<>_\-+=[\]/\\;'`~]/.test(p) },
];

const SignupPage = () => {
  const [form, setForm] = useState(initialForm);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors([]);
    setLoading(true);
    try {
      await signup(form);
      navigate('/biometric-setup', { state: { mode: 'signup' } });
    } catch (err) {
      const data = err.response?.data;
      setErrors(data?.errors || [data?.message || 'Something went wrong. Please try again.']);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Create your account" subtitle="Join Parola Bolt — verified, positive, real.">
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.length > 0 && (
          <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-300">
            <div className="flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <ul className="space-y-1">
                {errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1.5">Full name</label>
          <input
            name="fullName"
            value={form.fullName}
            onChange={handleChange}
            required
            placeholder="Sneha Bharti"
            className="input-field"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1.5">Username</label>
            <input
              name="username"
              value={form.username}
              onChange={handleChange}
              required
              placeholder="sneha.b"
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Date of birth</label>
            <input
              type="date"
              name="dateOfBirth"
              value={form.dateOfBirth}
              onChange={handleChange}
              required
              className="input-field"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Email</label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            required
            placeholder="you@example.com"
            className="input-field"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Mobile number</label>
          <input
            type="tel"
            name="mobileNumber"
            value={form.mobileNumber}
            onChange={handleChange}
            required
            placeholder="+91 98765 43210"
            className="input-field"
          />
          <p className="mt-1 text-xs text-ink-700/50 dark:text-cream/40">
            Used for biometric backup and SMS fallback delivery.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              placeholder="Create a strong password"
              className="input-field pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-700/50 dark:text-cream/40"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {form.password && (
            <ul className="mt-2 grid grid-cols-2 gap-1 text-xs">
              {PASSWORD_RULES.map((rule) => {
                const passed = rule.test(form.password);
                return (
                  <li key={rule.label} className={passed ? 'text-mint' : 'text-ink-700/40 dark:text-cream/30'}>
                    {passed ? '✓' : '•'} {rule.label}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Confirm password</label>
          <input
            type={showPassword ? 'text' : 'password'}
            name="confirmPassword"
            value={form.confirmPassword}
            onChange={handleChange}
            required
            placeholder="Re-enter your password"
            className="input-field"
          />
        </div>

        <p className="text-xs text-ink-700/50 dark:text-cream/40">
          By continuing, you confirm you are 18 years of age or older. Parola Bolt does not permit accounts for
          minors.
        </p>

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Creating account…' : 'Continue to biometric verification'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-700/60 dark:text-cream/50">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-bolt-600 dark:text-bolt-300">
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
};

export default SignupPage;
