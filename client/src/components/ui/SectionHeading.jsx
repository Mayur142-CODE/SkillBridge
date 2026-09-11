import { useScrollReveal } from '../../hooks/useScrollReveal';

export default function SectionHeading({ eyebrow, title, subtitle, align = 'center', light = false }) {
  const [ref, isVisible] = useScrollReveal();
  return (
    <div
      ref={ref}
      className={`section-heading ${align === 'center' ? 'section-heading--center' : ''} reveal ${isVisible ? 'reveal--visible' : ''}`}
    >
      {eyebrow && (
        <p className={`eyebrow section-heading__eyebrow ${light ? 'text-saffron' : ''}`}>
          {eyebrow}
        </p>
      )}
      <h2
        className={`section-heading__title display-md ${light ? '' : ''}`}
        style={{ color: light ? 'var(--color-ivory)' : undefined }}
        dangerouslySetInnerHTML={{ __html: title }}
      />
      {subtitle && (
        <p className="section-heading__subtitle" style={{ color: light ? 'rgba(247,243,234,0.5)' : undefined }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
