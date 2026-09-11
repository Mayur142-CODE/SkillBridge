import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../components/auth/AuthLayout';
import AuthInput from '../components/auth/AuthInput';
import PasswordInput from '../components/auth/PasswordInput';
import Button from '../components/ui/Button';

export default function IndustryRegister() {
  const [form, setForm] = useState({
    companyName: '',
    email: '',
    sector: '',
    contactPerson: '',
    phone: '',
    website: '',
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
    if (!form.companyName.trim()) errs.companyName = 'Company name is required';
    if (!form.email.trim()) errs.email = 'Official email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Enter a valid email';
    if (!form.contactPerson.trim()) errs.contactPerson = 'Contact person is required';
    if (!form.phone.trim()) errs.phone = 'Phone is required';
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
      title="Industry Registration"
      subtitle="Register your organization to discover talent and post opportunities."
    >
      <form onSubmit={handleSubmit} noValidate>
        <AuthInput
          label="Company Name"
          placeholder="Nexora Technologies Pvt. Ltd."
          value={form.companyName}
          onChange={update('companyName')}
          error={errors.companyName}
          required
        />

        <AuthInput
          label="Official Email"
          type="email"
          placeholder="hr@nexora.com"
          value={form.email}
          onChange={update('email')}
          error={errors.email}
          required
          autoComplete="email"
        />

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">
              Sector
            </label>
            <select
              value={form.sector}
              onChange={update('sector')}
              className="form-input form-select"
            >
              <option value="">Select sector</option>
              <option value="it">Information Technology</option>
              <option value="manufacturing">Manufacturing</option>
              <option value="finance">Finance & Banking</option>
              <option value="healthcare">Healthcare</option>
              <option value="education">Education</option>
              <option value="consulting">Consulting</option>
              <option value="other">Other</option>
            </select>
          </div>
          <AuthInput
            label="Contact Person"
            placeholder="Priya Mehta"
            value={form.contactPerson}
            onChange={update('contactPerson')}
            error={errors.contactPerson}
            required
          />
        </div>

        <div className="form-row">
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
          <AuthInput
            label="Company Website"
            type="url"
            placeholder="https://nexora.com"
            value={form.website}
            onChange={update('website')}
            hint="Optional"
          />
        </div>

        {/* File upload */}
        <div className="form-group">
          <label className="form-label">
            Authorization Letter
          </label>
          <div className="file-upload">
            <svg className="file-upload__icon" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
            <p className="file-upload__text">
              Drop your authorization letter here or <span style={{ color: 'var(--color-ember)' }}>browse</span>
            </p>
            <p className="file-upload__hint">PDF, up to 5 MB</p>
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

        {/* Verification notice */}
        <div className="notice notice--warning" style={{ margin: 'var(--space-5) 0' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="notice__icon">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <span>
            Your organization will be reviewed before Industry Panel access is granted.
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
            'Register Organization'
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

