import { Link } from 'react-router-dom';
import { GraduationCap, Building2, BookOpen, Landmark } from 'lucide-react';
import AuthLayout from '../components/auth/AuthLayout';
import { ROLES } from '../utils/constants';

const iconMap = {
  GraduationCap,
  Building2,
  BookOpen,
  Landmark,
};

export default function RegisterPage() {
  return (
    <AuthLayout
      title="Join the ecosystem."
      subtitle="How will you use the platform?"
      wide
    >
      <div className="role-selector__grid">
        {ROLES.map((role) => {
          const Icon = iconMap[role.icon];
          return (
            <Link
              key={role.id}
              to={role.route}
              className="role-selector__card"
            >
              <div
                className="role-selector__card-icon"
                style={{
                  backgroundColor: `${role.hex}14`,
                  color: role.hex,
                }}
              >
                {Icon && <Icon size={20} strokeWidth={2} />}
              </div>

              <h3 className="role-selector__card-title">
                {role.label}
              </h3>

              <p className="role-selector__card-desc">
                {role.description}
              </p>

              <div className="role-selector__card-arrow">
                <span>Continue</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          );
        })}
      </div>

      <p className="auth-form__footer">
        Already have an account?{' '}
        <Link to="/login" className="auth-form__link">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}

