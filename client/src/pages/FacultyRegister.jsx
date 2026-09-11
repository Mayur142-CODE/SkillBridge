import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../components/auth/AuthLayout';
import AuthInput from '../components/auth/AuthInput';
import PasswordInput from '../components/auth/PasswordInput';
import Button from '../components/ui/Button';

export default function FacultyRegister() {
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
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Full name is required';
    if (!form.email.trim()) errs.email = 'Official email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Enter a valid email';
    if (!form.university.trim()) errs.university = 'University is required';
    if (!form.department.trim()) errs.department = 'Department is required';
    if (!form.password) errs.password = 'Password is required';
    else if (form.password.length < 8) errs.password = 'At least 8 characters';
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
    setTimeout(() => setLoading(false), 1500);
  };

  return (
    <AuthLayout
      title="Academician Registration"
      subtitle="Join the platform to mentor students and collaborate with industry."
    >
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

