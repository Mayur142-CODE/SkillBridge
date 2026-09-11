import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../components/auth/AuthLayout';
import AuthInput from '../components/auth/AuthInput';
import PasswordInput from '../components/auth/PasswordInput';
import ProgressIndicator from '../components/auth/ProgressIndicator';
import Button from '../components/ui/Button';

const STEPS = [
  { label: 'Basic' },
  { label: 'Academic' },
  { label: 'Account' },
];

export default function StudentRegister() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    university: '',
    rollNumber: '',
    branch: '',
    year: '',
    cgpa: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const update = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value });
    if (errors[field]) setErrors({ ...errors, [field]: '' });
  };

  const validateStep = () => {
    const errs = {};
    if (step === 0) {
      if (!form.name.trim()) errs.name = 'Full name is required';
      if (!form.email.trim()) errs.email = 'Email is required';
      else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Enter a valid email';
      if (!form.phone.trim()) errs.phone = 'Phone number is required';
      else if (!/^\d{10}$/.test(form.phone.replace(/\D/g, '')))
        errs.phone = 'Enter a valid 10-digit phone number';
    } else if (step === 1) {
      if (!form.university.trim()) errs.university = 'University is required';
      if (!form.rollNumber.trim()) errs.rollNumber = 'Roll number is required';
      if (!form.branch.trim()) errs.branch = 'Branch is required';
      if (!form.year) errs.year = 'Year is required';
    } else if (step === 2) {
      if (!form.password) errs.password = 'Password is required';
      else if (form.password.length < 8) errs.password = 'At least 8 characters';
      if (form.password !== form.confirmPassword)
        errs.confirmPassword = 'Passwords do not match';
    }
    return errs;
  };

  const handleNext = (e) => {
    e.preventDefault();
    const errs = validateStep();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      setLoading(true);
      setTimeout(() => setLoading(false), 1500);
    }
  };

  return (
    <AuthLayout
      title="Student Registration"
      subtitle="Create your account and start building your verified portfolio."
    >
      <ProgressIndicator steps={STEPS} currentStep={step} />

      <form onSubmit={handleNext} noValidate>
        {step === 0 && (
          <div className="animate-fade-in">
            <AuthInput
              label="Full Name"
              placeholder="Ananya Sharma"
              value={form.name}
              onChange={update('name')}
              error={errors.name}
              required
              autoComplete="name"
            />
            <AuthInput
              label="Email"
              type="email"
              placeholder="ananya@university.edu"
              value={form.email}
              onChange={update('email')}
              error={errors.email}
              required
              autoComplete="email"
            />
            <AuthInput
              label="Phone"
              type="tel"
              placeholder="+91 98765 43210"
              value={form.phone}
              onChange={update('phone')}
              error={errors.phone}
              required
              autoComplete="tel"
            />
          </div>
        )}

        {step === 1 && (
          <div className="animate-fade-in">
            <AuthInput
              label="University / Institution"
              placeholder="Indian Institute of Technology, Delhi"
              value={form.university}
              onChange={update('university')}
              error={errors.university}
              required
            />
            <div className="form-row">
              <AuthInput
                label="Roll Number"
                placeholder="2021CSE1042"
                value={form.rollNumber}
                onChange={update('rollNumber')}
                error={errors.rollNumber}
                required
              />
              <AuthInput
                label="Branch"
                placeholder="Computer Science"
                value={form.branch}
                onChange={update('branch')}
                error={errors.branch}
                required
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">
                  Year<span className="form-label__required">*</span>
                </label>
                <select
                  value={form.year}
                  onChange={update('year')}
                  className={`form-input form-select ${errors.year ? 'form-input--error' : ''}`.trim()}
                >
                  <option value="">Select year</option>
                  <option value="1">1st Year</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                  <option value="4">4th Year</option>
                  <option value="5">5th Year</option>
                </select>
                {errors.year && (
                  <p className="form-error" role="alert">{errors.year}</p>
                )}
              </div>
              <AuthInput
                label="CGPA"
                type="number"
                placeholder="8.5"
                value={form.cgpa}
                onChange={update('cgpa')}
                hint="Optional"
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade-in">
            <PasswordInput
              label="Password"
              placeholder="Create a strong password"
              value={form.password}
              onChange={update('password')}
              error={errors.password}
              hint="At least 8 characters"
              required
              autoComplete="new-password"
            />
            <PasswordInput
              label="Confirm Password"
              placeholder="Re-enter your password"
              value={form.confirmPassword}
              onChange={update('confirmPassword')}
              error={errors.confirmPassword}
              required
              autoComplete="new-password"
            />

            {/* Verification notice */}
            <div className="notice notice--warning" style={{ marginTop: 'var(--space-4)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="notice__icon">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <span>
                Your institution may need to verify your enrollment before full access is granted.
              </span>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginTop: 'var(--space-8)' }}>
          {step > 0 && (
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setStep(step - 1)}
            >
              Back
            </Button>
          )}
          <Button
            type="submit"
            size="lg"
            style={{ flex: 1 }}
            disabled={loading}
            withArrow={step === STEPS.length - 1}
          >
            {loading ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <span className="spinner" />
                Creating account…
              </span>
            ) : step < STEPS.length - 1 ? (
              'Continue'
            ) : (
              'Create Account'
            )}
          </Button>
        </div>

        <p className="auth-form__footer">
          Already have an account?{' '}
          <Link to="/login" className="auth-form__link">
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

