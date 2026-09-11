import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/auth/AuthLayout';
import AuthInput from '../components/auth/AuthInput';
import PasswordInput from '../components/auth/PasswordInput';
import Button from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';

export default function FacultyRegister() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [form, setForm] = useState({
    name: '',
    email: '',
    university: '',
    department: '',
    designation: '',
    expertise: '',
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const update = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value });
    if (errors[field]) setErrors({ ...errors, [field]: '' });
    if (errors.general) setErrors({ ...errors, general: '' });
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Full name is required';
    if (!form.email.trim()) errs.email = 'Official email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Enter a valid email';
    if (!form.university.trim()) errs.university = 'University / Institution is required';
    if (!form.department.trim()) errs.department = 'Department is required';
    if (!form.password) errs.password = 'Password is required';
    else if (form.password.length < 8) errs.password = 'At least 8 characters';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setLoading(true);
    setErrors({});
    const result = await register('academician', {
      name: form.name,
      email: form.email,
      institution: form.university,
      department: form.department,
      designation: form.designation || 'Faculty',
      expertise: form.expertise,
      password: form.password,
    });
    setLoading(false);

    if (result.success) {
      navigate('/pending-verification', {
        state: {
          message: result.message,
          role: 'Academician',
        },
      });
    } else {
      setErrors({ general: result.message || 'Registration failed.' });
    }
  };

  return (
    <AuthLayout
      title="Academician Registration"
      subtitle="Join the platform to mentor students and collaborate with industry."
    >
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

      <form onSubmit={handleSubmit} noValidate>
        <AuthInput
          label="Full Name"
          placeholder="Dr. Rajesh Kumar"
          value={form.name}
          onChange={update('name')}
          error={errors.name}
          required
          autoComplete="name"
        />

        <AuthInput
          label="Official Email"
          type="email"
          placeholder="rajesh.kumar@university.edu"
          value={form.email}
          onChange={update('email')}
          error={errors.email}
          required
          autoComplete="email"
        />

        <AuthInput
          label="University / Institution"
          placeholder="Indian Institute of Technology, Bombay"
          value={form.university}
          onChange={update('university')}
          error={errors.university}
          required
        />

        <div className="form-row">
          <AuthInput
            label="Department"
            placeholder="Computer Science"
            value={form.department}
            onChange={update('department')}
            error={errors.department}
            required
          />
          <div className="form-group">
            <label className="form-label">
              Designation
            </label>
            <select
              value={form.designation}
              onChange={update('designation')}
              className="form-input form-select"
            >
              <option value="">Select</option>
              <option value="professor">Professor</option>
              <option value="associate-professor">Associate Professor</option>
              <option value="assistant-professor">Assistant Professor</option>
              <option value="lecturer">Lecturer</option>
              <option value="hod">Head of Department</option>
              <option value="dean">Dean</option>
            </select>
          </div>
        </div>

        <AuthInput
          label="Expertise Areas"
          placeholder="Machine Learning, NLP, Computer Vision"
          value={form.expertise}
          onChange={update('expertise')}
          hint="Comma separated"
        />

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

        {/* Approval notice */}
        <div className="notice notice--info" style={{ margin: 'var(--space-5) 0' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="notice__icon">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <span>
            Your institution may need to approve this registration before full access is granted.
          </span>
        </div>

        <Button
          type="submit"
          size="lg"
          style={{ width: '100%' }}
          disabled={loading}
          withArrow
        >
          {loading ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <span className="spinner" />
              Registering…
            </span>
          ) : (
            'Create Account'
          )}
        </Button>

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

