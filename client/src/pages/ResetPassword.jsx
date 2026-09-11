import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../components/auth/AuthLayout';
import PasswordInput from '../components/auth/PasswordInput';
import Button from '../components/ui/Button';

export default function ResetPassword() {
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const update = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value });
    if (errors[field]) setErrors({ ...errors, [field]: '' });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.password) errs.password = 'Password is required';
    else if (form.password.length < 8) errs.password = 'At least 8 characters';
    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
    }, 1500);
  };

  if (success) {
    return (
      <AuthLayout>
        <div style={{ textAlign: 'center' }} className="animate-fade-in">
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: 'rgba(184, 216, 192, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto var(--space-6)',
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-sage-dark)" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h2 className="auth-form__title" style={{ textAlign: 'center' }}>Password updated.</h2>
          <p className="auth-form__subtitle" style={{ textAlign: 'center', margin: '0 auto var(--space-6)' }}>
            Your password has been successfully reset. You can now sign in with your new password.
          </p>
          <Link to="/login">
            <Button size="md" withArrow>
              Sign in
            </Button>
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Set a new password."
      subtitle="Your new password must be at least 8 characters long."
    >
      <form onSubmit={handleSubmit} noValidate>
        <PasswordInput
          label="New Password"
          placeholder="Enter your new password"
          value={form.password}
          onChange={update('password')}
          error={errors.password}
          hint="At least 8 characters"
          required
          autoComplete="new-password"
        />

        <PasswordInput
          label="Confirm New Password"
          placeholder="Re-enter your new password"
          value={form.confirmPassword}
          onChange={update('confirmPassword')}
          error={errors.confirmPassword}
          required
          autoComplete="new-password"
        />

        <Button
          type="submit"
          size="lg"
          style={{ width: '100%', marginTop: 'var(--space-6)' }}
          disabled={loading}
          withArrow
        >
          {loading ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <span className="spinner" />
              Updating…
            </span>
          ) : (
            'Reset Password'
          )}
        </Button>

        <p className="auth-form__footer">
          Remember your password?{' '}
          <Link to="/login" className="auth-form__link">
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

