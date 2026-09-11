import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/auth/AuthLayout';
import { useAuth } from '../context/AuthContext';
import AuthInput from '../components/auth/AuthInput';
import PasswordInput from '../components/auth/PasswordInput';
import SelectInput from '../components/auth/SelectInput';
import InstitutionSelect from '../components/auth/InstitutionSelect';
import ProgressIndicator from '../components/auth/ProgressIndicator';
import Button from '../components/ui/Button';
import { getInstitutionName } from '../data/mockInstitutions';

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
    institutionId: '',
    program: '',
    semester: '',
    division: '',
    studentId: '',
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
      else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Enter a valid email address';
    } else if (step === 1) {
      if (!form.institutionId) errs.institutionId = 'Please select your institution';
      if (!form.program.trim()) errs.program = 'Program is required';
      if (!form.semester) errs.semester = 'Semester is required';
      if (!form.division.trim()) errs.division = 'Division is required';
      if (!form.studentId.trim()) errs.studentId = 'Student ID is required';
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
        institutionId: form.institutionId,
        university: getInstitutionName(form.institutionId),
        program: form.program,
        semester: form.semester,
        division: form.division,
        studentId: form.studentId,
        rollNumber: form.studentId,
        password: form.password,
        confirmPassword: form.confirmPassword,
      });
      setLoading(false);

      if (result.success) {
        navigate('/login', {
          state: {
            registered: true,
            email: form.email,
            role: 'student',
            message: 'Student account registered successfully! You can now sign in.',
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
      subtitle="Create your account under your registered institution."
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
          </div>
        )}

        {step === 1 && (
          <div className="form-grid animate-fade-in">
            {/* Institution Selector — Searchable dropdown */}
            <InstitutionSelect
              className="form-grid-full"
              label="Institution / University"
              placeholder="Select your institution"
              value={form.institutionId}
              onChange={update('institutionId')}
              error={errors.institutionId}
              required
            />

            <AuthInput
              className="form-grid-half"
              label="Program"
              placeholder="e.g. B.Tech Computer Science"
              value={form.program}
              onChange={update('program')}
              error={errors.program}
              required
            />

            <SelectInput
              className="form-grid-half"
              label="Semester"
              value={form.semester}
              onChange={update('semester')}
              error={errors.semester}
              required
            >
              <option value="">Select semester</option>
              <option value="Semester 1">Semester 1</option>
              <option value="Semester 2">Semester 2</option>
              <option value="Semester 3">Semester 3</option>
              <option value="Semester 4">Semester 4</option>
              <option value="Semester 5">Semester 5</option>
              <option value="Semester 6">Semester 6</option>
              <option value="Semester 7">Semester 7</option>
              <option value="Semester 8">Semester 8</option>
            </SelectInput>

            <AuthInput
              className="form-grid-half"
              label="Division"
              placeholder="e.g. Division A"
              value={form.division}
              onChange={update('division')}
              error={errors.division}
              required
            />

            <AuthInput
              className="form-grid-half"
              label="Student ID"
              placeholder="e.g. 2024CS1042"
              value={form.studentId}
              onChange={update('studentId')}
              error={errors.studentId}
              required
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
