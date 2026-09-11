export default function ProgressIndicator({ steps, currentStep }) {
  return (
    <div
      className="progress-indicator"
      role="progressbar"
      aria-valuenow={currentStep + 1}
      aria-valuemin={1}
      aria-valuemax={steps.length}
    >
      {steps.map((step, i) => {
        const isActive = i === currentStep;
        const isCompleted = i < currentStep;
        const badgeModifier = isCompleted
          ? 'progress-indicator__badge--completed'
          : isActive
            ? 'progress-indicator__badge--active'
            : 'progress-indicator__badge--inactive';

        return (
          <div key={step.label} className="progress-indicator__step" style={{ flex: i < steps.length - 1 ? 1 : 'none' }}>
            <div className={`progress-indicator__badge ${badgeModifier}`}>
              {isCompleted ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              ) : (
                `0${i + 1}`
              )}
            </div>
            <span
              className={`progress-indicator__label ${
                isActive ? 'progress-indicator__label--active' : ''
              }`.trim()}
            >
              {step.label}
            </span>
            {i < steps.length - 1 && (
              <div className="progress-indicator__connector">
                <div
                  className="progress-indicator__connector-fill"
                  style={{ width: isCompleted ? '100%' : '0%' }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

