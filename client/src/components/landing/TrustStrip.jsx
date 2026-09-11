import { Users, Brain, BadgeCheck, Handshake, FolderOpen } from 'lucide-react';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import { TRUST_ITEMS } from '../../utils/constants';

const iconMap = {
  Users,
  Brain,
  BadgeCheck,
  Handshake,
  FolderOpen,
};

export default function TrustStrip() {
  const [ref, isVisible] = useScrollReveal({ threshold: 0.3 });

  return (
    <section
      ref={ref}
      className={`trust-strip reveal ${isVisible ? 'reveal--visible' : ''}`}
      aria-label="Platform highlights"
    >
      <div className="container">
        <div className="trust-strip__list">
          {TRUST_ITEMS.map((item, i) => {
            const Icon = iconMap[item.icon];
            return (
              <div key={item.label} className="trust-strip__item">
                <div className="trust-strip__icon">
                  {Icon && <Icon size={18} strokeWidth={2} />}
                </div>
                <span className="trust-strip__label">{item.label}</span>
                {i < TRUST_ITEMS.length - 1 && (
                  <div className="trust-strip__divider" aria-hidden="true" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

