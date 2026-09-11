import { GraduationCap, Building2, BookOpen, Landmark, Shield } from 'lucide-react';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import SectionHeading from '../ui/SectionHeading';
import { ROLES } from '../../utils/constants';

const iconMap = {
  GraduationCap,
  Building2,
  BookOpen,
  Landmark,
  Shield,
};

const ADMIN_ROLE = {
  id: 'admin',
  label: 'Platform Admin',
  color: 'plum',
  hex: '#352044',
  icon: 'Shield',
  description: 'Verify stakeholders, manage users and monitor the ecosystem.',
  capabilities: [
    'Verify stakeholders',
    'Manage users',
    'Manage skills',
    'Monitor platform',
  ],
};

export default function EcosystemRoles() {
  const [ref, isVisible] = useScrollReveal();
  const allRoles = [...ROLES, ADMIN_ROLE];

  return (
    <section id="students" className="section section--muted" aria-labelledby="ecosystem-heading">
      <div className="container">
        <SectionHeading
          eyebrow="The Ecosystem"
          title='One ecosystem.<br/><span class="text-ember">Five perspectives.</span>'
          subtitle="Every stakeholder has a purpose. Every connection creates value."
        />

        <div
          ref={ref}
          className={`roles__grid reveal ${isVisible ? 'reveal--visible' : ''}`}
        >
          {allRoles.map((role, i) => {
            const Icon = iconMap[role.icon] || Shield;
            return (
              <div
                key={role.id}
                className="role-card"
                style={{
                  transitionDelay: `${i * 60}ms`,
                  '--card-accent': role.hex,
                }}
              >
                <div
                  className="role-card__icon"
                  style={{
                    backgroundColor: `${role.hex}14`,
                    color: role.hex,
                  }}
                >
                  <Icon size={20} strokeWidth={2} />
                </div>

                <h3 className="role-card__title">{role.label}</h3>

                <p className="role-card__desc">{role.description}</p>

                {/* Capabilities — revealed on hover */}
                <div className="role-card__capabilities">
                  {role.capabilities.map((cap) => (
                    <div key={cap} className="role-card__cap-item">
                      <span
                        className="role-card__cap-dot"
                        style={{ backgroundColor: role.hex }}
                      />
                      <span>{cap}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

