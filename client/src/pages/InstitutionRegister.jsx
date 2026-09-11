import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/auth/AuthLayout';
import AuthInput from '../components/auth/AuthInput';
import PasswordInput from '../components/auth/PasswordInput';
import Button from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';

export default function InstitutionRegister() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [form, setForm] = useState({
    institutionName: '',
    aisheCode: '',
    email: '',
    contactPerson: '',
    phone: '',
    address: '',
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
    if (!form.institutionName.trim()) errs.institutionName = 'Institution name is required';
    if (!form.aisheCode.trim()) errs.aisheCode = 'AISHE / UGC code is required';
    if (!form.email.trim()) errs.email = 'Official email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Enter a valid email';
    if (!form.contactPerson.trim()) errs.contactPerson = 'Contact person is required';
    if (!form.phone.trim()) errs.phone = 'Phone is required';
    if (!form.address.trim()) errs.address = 'Address is required';
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
    const result = await register('institution', {
      institutionName: form.institutionName,
      aisheCode: form.aisheCode,
      email: form.email,
      contactPerson: form.contactPerson,
      phone: form.phone,
      address: form.address,
      password: form.password,
    });
    setLoading(false);

    if (result.success) {
      navigate('/pending-verification', {
        state: {
          message: result.message,
          role: 'Institution',
        },
      });
    } else {
      setErrors({ general: result.message || 'Registration failed.' });
    }
  };

  return (
    <AuthLayout
      title="Institution Registration"
      subtitle="Register your institution to manage students, placements and industry partnerships."
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
      {/* Official registration badge */}
      <div className="notice notice--official" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="navbar__logo-mark" style={{ width: '28px', height: '28px', backgroundColor: 'var(--color-plum)' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>
        <div>
          <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-ink)' }}>Official Institutional Registration</p>
          <p style={{ fontSize: '11px', color: 'var(--color-ink-muted)', marginTop: '2px' }}>Subject to platform administrator verification</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <AuthInput
          label="University / Institution Name"
          placeholder="Delhi Technological University"
          value={form.institutionName}
          onChange={update('institutionName')}
          error={errors.institutionName}
          required
        />

        <AuthInput
          label="AISHE / UGC Code"
          placeholder="U-0456"
          value={form.aisheCode}
          onChange={update('aisheCode')}
          error={errors.aisheCode}
          hint="All India Survey on Higher Education code"
          required
        />

        <AuthInput
          label="Official Email"
          type="email"
          placeholder="registrar@dtu.ac.in"
          value={form.email}
          onChange={update('email')}
          error={errors.email}
          required
          autoComplete="email"
        />

        <div className="form-row">
          <AuthInput
            label="Contact Person"
            placeholder="Dr. Anil Gupta"
            value={form.contactPerson}
            onChange={update('contactPerson')}
            error={errors.contactPerson}
            required
          />
          <AuthInput
            label="Phone"
            type="tel"
            placeholder="+91 11 2787 1234"
            value={form.phone}
            onChange={update('phone')}
            error={errors.phone}
            required
            autoComplete="tel"
          />
        </div>

        <AuthInput
          label="Address"
          placeholder="Shahbad Daulatpur, Main Bawana Road, Delhi 110042"
          value={form.address}
          onChange={update('address')}
          error={errors.address}
          required
        />

        {/* File upload */}
        <div className="form-group">
          <label className="form-label">
            Official Letterhead PDF
          </label>
          <div className="file-upload">
            <svg className="file-upload__icon" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
            <p className="file-upload__text">
              Upload official letterhead or <span style={{ color: 'var(--color-ember)' }}>browse</span>
            </p>
            <p className="file-upload__hint">PDF only, up to 10 MB</p>
          </div>
        </div>

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

        {/* Verification status */}
        <div className="notice notice--official" style={{ margin: 'var(--space-4) 0' }}>
          <div className="verification-badge">
            <div className="verification-badge__dot" />
            <span className="verification-badge__label">
              Pending Verification Flow
            </span>
          </div>
        </div>
        <p className="form-hint" style={{ marginTop: '-8px', marginBottom: 'var(--space-6)' }}>
          The platform administrator will review your submitted information and documents. You will be notified once verification is complete.
        </p>

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
              Submitting…
            </span>
          ) : (
            'Submit Registration'
          )}
        </Button>

        <p className="auth-form__footer">
          Already registered?{' '}
          <Link to="/login" className="auth-form__link">
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

