import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../components/auth/AuthLayout';
import AuthInput from '../components/auth/AuthInput';
import PasswordInput from '../components/auth/PasswordInput';
import Button from '../components/ui/Button';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(false);

  const update = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value });
    if (errors[field]) setErrors({ ...errors, [field]: '' });
  };

  const validate = () => {
    const errs = {};
    if (!form.email.trim()) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Enter a valid email address';
    if (!form.password) errs.password = 'Password is required';
    else if (form.password.length < 6) errs.password = 'Password must be at least 6 characters';
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setLoading(true);
    // Simulate API call
    setTimeout(() => setLoading(false), 1500);
  };

  return (
    <AuthLayout title="Welcome back." subtitle="Sign in to continue to your dashboard.">
      <form onSubmit={handleSubmit} noValidate>
        <AuthInput
          label="Email"
          type="email"
          placeholder="you@university.edu"
          value={form.email}
          onChange={update('email')}
          error={errors.email}
          required
          autoComplete="email"
        />

        <PasswordInput
          label="Password"
          placeholder="Enter your password"
          value={form.password}
          onChange={update('password')}
          error={errors.password}
          required
          autoComplete="current-password"
        />

        <div className="auth-options">
          <label className="auth-options__remember">
            <div
              className={`auth-options__checkbox ${remember ? 'auth-options__checkbox--checked' : ''}`}
              onClick={() => setRemember(!remember)}
            >
              {remember && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              )}
            </div>
            <span>Remember me</span>
          </label>

          <Link to="/forgot-password" className="auth-options__forgot">
            Forgot password?
          </Link>
        </div>

        <Button
          type="submit"
          size="lg"
          style={{ width: '100%' }}
          disabled={loading}
        >
          {loading ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <span className="spinner" />
              Signing in…
            </span>
          ) : (
            'Sign In'
          )}
        </Button>

        <p className="auth-form__footer">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="auth-form__link">
            Create account
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

