import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/auth/AuthLayout';
import AuthInput from '../components/auth/AuthInput';
import PasswordInput from '../components/auth/PasswordInput';
import SelectInput from '../components/auth/SelectInput';
import Button from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';

export default function FacultyRegister() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    university: '',
    department: '',
    designation: '',
    expertise: '',
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

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Full name is required';
    if (!form.email.trim()) errs.email = 'Official email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Enter a valid email';
    if (!form.phone.trim()) errs.phone = 'Phone number is required';
    if (!form.university.trim()) errs.university = 'Institution / University is required';
    if (!form.department.trim()) errs.department = 'Department is required';
    if (!form.password) errs.password = 'Password is required';
    else if (form.password.length < 8) errs.password = 'At least 8 characters';
    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
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
      phone: form.phone,
      institution: form.university,
      department: form.department,
      designation: form.designation || 'Faculty',
      expertise: form.expertise,
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
          role: 'academician',
          message: 'Academician account created successfully! You can now sign in.',
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
        <div className="form-grid animate-fade-in">
          <AuthInput
            className="form-grid-full"
            label="Full Name"
            placeholder="Dr. Rajesh Kumar"
            value={form.name}
            onChange={update('name')}
            error={errors.name}
            required
            autoComplete="name"
          />

          <AuthInput
            className="form-grid-half"
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
            className="form-grid-half"
            label="Phone"
            type="tel"
            placeholder="+91 98765 43210"
            value={form.phone}
            onChange={update('phone')}
            error={errors.phone}
            required
            autoComplete="tel"
          />

          <AuthInput
            className="form-grid-half"
            label="Institution / University"
            placeholder="Indian Institute of Technology, Bombay"
            value={form.university}
            onChange={update('university')}
            error={errors.university}
            required
          />

          <AuthInput
            className="form-grid-half"
            label="Department"
            placeholder="Computer Science & Engineering"
            value={form.department}
            onChange={update('department')}
            error={errors.department}
            required
          />

          <SelectInput
            className="form-grid-half"
            label="Designation"
            value={form.designation}
            onChange={update('designation')}
          >
            <option value="">Select designation</option>
            <option value="Professor">Professor</option>
            <option value="Associate Professor">Associate Professor</option>
            <option value="Assistant Professor">Assistant Professor</option>
            <option value="Head of Department">Head of Department</option>
            <option value="Dean">Dean</option>
            <option value="Lecturer">Lecturer</option>
          </SelectInput>

          <AuthInput
            className="form-grid-half"
            label="Expertise Areas"
            placeholder="AI, Machine Learning, Distributed Systems"
            value={form.expertise}
            onChange={update('expertise')}
            hint="Comma separated"
          />

          <PasswordInput
            className="form-grid-half"
            label="Password"
            placeholder="Create password"
            value={form.password}
            onChange={update('password')}
            error={errors.password}
            hint="At least 8 characters"
            required
            autoComplete="new-password"
          />

          <PasswordInput
            className="form-grid-half"
            label="Confirm Password"
            placeholder="Re-enter password"
            value={form.confirmPassword}
            onChange={update('confirmPassword')}
            error={errors.confirmPassword}
            required
            autoComplete="new-password"
          />
        </div>

        <div className="form-actions">
          <Button
            type="submit"
            className="btn--submit"
            disabled={loading}
            withArrow
          >
            {loading ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <span className="spinner" />
                Creating account…
              </span>
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
