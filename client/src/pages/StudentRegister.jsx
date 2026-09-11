import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/auth/AuthLayout';
import { useAuth } from '../context/AuthContext';
import AuthInput from '../components/auth/AuthInput';
import PasswordInput from '../components/auth/PasswordInput';
import SelectInput from '../components/auth/SelectInput';
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
    if (errors.general) setErrors({ ...errors, general: '' });
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
      if (!form.university.trim()) errs.university = 'University / Institution is required';
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

  const navigate = useNavigate();
  const { register } = useAuth();

  const handleNext = async (e) => {
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
      setErrors({});
      const result = await register('student', {
        name: form.name,
        email: form.email,
        phone: form.phone,
        university: form.university,
        rollNumber: form.rollNumber,
        branch: form.branch,
        academicYear: form.year,
        cgpa: form.cgpa,
        password: form.password,
        confirmPassword: form.confirmPassword,
      });
      setLoading(false);

      if (result.success) {
        // Preferred flow: Register -> Login with auto-verified status
        navigate('/login', {
          state: {
            registered: true,
            email: form.email,
            role: 'student',
            message: 'Student account created successfully! You can now sign in.',
          },
        });
      } else {
        setErrors({ general: result.message || 'Registration failed.' });
      }
    }
  };

  return (
    <AuthLayout
      title="Student Registration"
      subtitle="Create your account and start building your verified portfolio."
    >
      <ProgressIndicator steps={STEPS} currentStep={step} />

      {errors.general && (
        <div
          className="animate-fade-in"
          style={{
            backgroundColor: 'rgba(209, 67, 67, 0.1)',
            border: '1px solid rgba(209, 67, 67, 0.25)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 16px',
            marginBottom: 'var(--space-6)',
            fontSize: '14px',
            color: 'var(--color-error)',
            fontWeight: '500',
          }}
        >
          {errors.general}
        </div>
      )}

      <form onSubmit={handleNext} noValidate>
        {step === 0 && (
          <div className="form-grid animate-fade-in">
            <AuthInput
              className="form-grid-full"
              label="Full Name"
              placeholder="Ananya Sharma"
              value={form.name}
              onChange={update('name')}
              error={errors.name}
              required
              autoComplete="name"
            />
            <AuthInput
              className="form-grid-full"
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
              className="form-grid-full"
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
          <div className="form-grid animate-fade-in">
            <AuthInput
              className="form-grid-full"
              label="University / Institution"
              placeholder="Indian Institute of Technology, Bombay"
              value={form.university}
              onChange={update('university')}
              error={errors.university}
              required
            />
            <AuthInput
              className="form-grid-half"
              label="Roll Number"
              placeholder="2021CSE1042"
              value={form.rollNumber}
              onChange={update('rollNumber')}
              error={errors.rollNumber}
              required
            />
            <AuthInput
              className="form-grid-half"
              label="Branch"
              placeholder="Computer Science"
              value={form.branch}
              onChange={update('branch')}
              error={errors.branch}
              required
            />
            <SelectInput
              className="form-grid-half"
              label="Year"
              value={form.year}
              onChange={update('year')}
              error={errors.year}
              required
            >
              <option value="">Select year</option>
              <option value="1st Year">1st Year</option>
              <option value="2nd Year">2nd Year</option>
              <option value="3rd Year">3rd Year</option>
              <option value="4th Year">4th Year</option>
              <option value="5th Year">5th Year</option>
            </SelectInput>
            <AuthInput
              className="form-grid-half"
              label="CGPA"
              type="number"
              step="0.01"
              min="0"
              max="10"
              placeholder="8.5"
              value={form.cgpa}
              onChange={update('cgpa')}
              hint="Optional"
            />
          </div>
        )}

        {step === 2 && (
          <div className="form-grid animate-fade-in">
            <PasswordInput
              className="form-grid-full"
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
              className="form-grid-full"
              label="Confirm Password"
              placeholder="Re-enter your password"
              value={form.confirmPassword}
              onChange={update('confirmPassword')}
              error={errors.confirmPassword}
              required
              autoComplete="new-password"
            />
          </div>
        )}

        <div className="form-actions">
          {step > 0 && (
            <Button
              type="button"
              variant="outline"
              className="btn--back"
              onClick={() => setStep(step - 1)}
            >
              Back
            </Button>
          )}
          <Button
            type="submit"
            className="btn--submit"
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
