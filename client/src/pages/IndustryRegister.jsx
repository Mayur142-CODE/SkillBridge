import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/auth/AuthLayout';
import AuthInput from '../components/auth/AuthInput';
import PasswordInput from '../components/auth/PasswordInput';
import SelectInput from '../components/auth/SelectInput';
import Button from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';

export default function IndustryRegister() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [form, setForm] = useState({
    companyName: '',
    email: '',
    sector: '',
    contactPerson: '',
    phone: '',
    website: '',
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
    if (!form.companyName.trim()) errs.companyName = 'Company name is required';
    if (!form.email.trim()) errs.email = 'Official email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Enter a valid email';
    if (!form.contactPerson.trim()) errs.contactPerson = 'Contact person is required';
    if (!form.phone.trim()) errs.phone = 'Phone is required';
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
    const result = await register('industry', {
      companyName: form.companyName,
      email: form.email,
      sector: form.sector || 'Information Technology',
      contactPerson: form.contactPerson,
      phone: form.phone,
      website: form.website,
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
          role: 'industry',
          message: 'Industry account registered successfully! You can now sign in.',
        },
      });
    } else {
      setErrors({ general: result.message || 'Registration failed.' });
    }
  };

  return (
    <AuthLayout
      title="Industry Registration"
      subtitle="Register your organization to discover talent and post opportunities."
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
            label="Company Name"
            placeholder="Nexora Technologies Pvt. Ltd."
            value={form.companyName}
            onChange={update('companyName')}
            error={errors.companyName}
            required
          />

          <AuthInput
            className="form-grid-half"
            label="Official Email"
            type="email"
            placeholder="hr@nexora.com"
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

          <SelectInput
            className="form-grid-half"
            label="Sector"
            value={form.sector}
            onChange={update('sector')}
          >
            <option value="">Select sector</option>
            <option value="Information Technology">Information Technology</option>
            <option value="Manufacturing">Manufacturing</option>
            <option value="Finance & Banking">Finance & Banking</option>
            <option value="Healthcare & Biotech">Healthcare & Biotech</option>
            <option value="Education & EdTech">Education & EdTech</option>
            <option value="Consulting & Services">Consulting & Services</option>
            <option value="Other">Other</option>
          </SelectInput>

          <AuthInput
            className="form-grid-half"
            label="Contact Person"
            placeholder="Priya Mehta"
            value={form.contactPerson}
            onChange={update('contactPerson')}
            error={errors.contactPerson}
            required
          />

          <AuthInput
            className="form-grid-full"
            label="Company Website"
            type="url"
            placeholder="https://nexora.com"
            value={form.website}
            onChange={update('website')}
            hint="Optional"
          />

          {/* File upload */}
          <div className="form-group form-grid-full">
            <label className="form-label">
              Authorization Letter
            </label>
            <div className="file-upload">
              <svg className="file-upload__icon" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
              <p className="file-upload__text">
                Drop authorization letter or <span style={{ color: 'var(--color-ember)' }}>browse file</span>
              </p>
              <p className="file-upload__hint">PDF, up to 5 MB</p>
            </div>
          </div>

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
                Registering…
              </span>
            ) : (
              'Register Organization'
            )}
          </Button>
        </div>

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
