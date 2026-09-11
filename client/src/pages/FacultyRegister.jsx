import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/auth/AuthLayout';
import AuthInput from '../components/auth/AuthInput';
import PasswordInput from '../components/auth/PasswordInput';
import SelectInput from '../components/auth/SelectInput';
import InstitutionSelect from '../components/auth/InstitutionSelect';
import Button from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';

export default function FacultyRegister() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    institutionId: '',
    department: '',
    designation: '',
    facultyId: '',
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
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Enter a valid email address';
    if (!form.password) errs.password = 'Password is required';
    else if (form.password.length < 8) errs.password = 'At least 8 characters';
    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    if (!form.institutionId) errs.institutionId = 'Please select your institution';
    if (!form.department.trim()) errs.department = 'Department is required';
    if (!form.designation) errs.designation = 'Designation is required';
    if (!form.facultyId.trim()) errs.facultyId = 'Faculty ID is required';
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
      password: form.password,
      confirmPassword: form.confirmPassword,
      institutionId: form.institutionId,
      department: form.department,
      designation: form.designation,
      facultyId: form.facultyId,
    });
    setLoading(false);

    if (result.success) {
      navigate('/login', {
        state: {
          registered: true,
          email: form.email,
          role: 'academician',
          message: 'Academician account registered successfully! You can now sign in.',
        },
      });
    } else {
      setErrors({ general: result.message || 'Registration failed.' });
    }
  };

  return (
    <AuthLayout
      title="Academician Registration"
      subtitle="Register under your affiliated institution to mentor and collaborate."
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
            className="form-grid-full"
            label="Email"
            type="email"
            placeholder="rajesh.kumar@university.edu"
            value={form.email}
            onChange={update('email')}
            error={errors.email}
            required
            autoComplete="email"
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
            label="Department"
            placeholder="e.g. Computer Science"
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
            error={errors.designation}
            required
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
            className="form-grid-full"
            label="Faculty ID"
            placeholder="e.g. FAC-2024-1049"
            value={form.facultyId}
            onChange={update('facultyId')}
            error={errors.facultyId}
            required
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
