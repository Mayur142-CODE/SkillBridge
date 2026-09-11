import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../components/auth/AuthLayout';
import AuthInput from '../components/auth/AuthInput';
import Button from '../components/ui/Button';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Enter a valid email address');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSent(true);
    }, 1500);
  };

  if (sent) {
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
          <h2 className="auth-form__title" style={{ textAlign: 'center' }}>Check your email.</h2>
          <p className="auth-form__subtitle" style={{ textAlign: 'center', maxWidth: '320px', margin: '0 auto var(--space-6)' }}>
            If an account exists for <strong style={{ color: 'var(--color-ink)' }}>{email}</strong>, you&apos;ll receive a password reset link shortly.
          </p>
          <Link to="/login">
            <Button variant="outline" size="md">
              Return to sign in
            </Button>
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Reset your password."
      subtitle="Enter the email associated with your account and we'll send a reset link."
    >
      <form onSubmit={handleSubmit} noValidate>
        <AuthInput
          label="Email"
          type="email"
          placeholder="you@university.edu"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (error) setError('');
          }}
          error={error}
          required
          autoComplete="email"
        />

        <Button
          type="submit"
          size="lg"
          style={{ width: '100%', marginTop: 'var(--space-5)' }}
          disabled={loading}
          withArrow
        >
          {loading ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <span className="spinner" />
              Sending link…
            </span>
          ) : (
            'Send Reset Link'
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

