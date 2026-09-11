import { forwardRef, useId } from 'react';

const AuthInput = forwardRef(function AuthInput(
  {
    label,
    type = 'text',
    error,
    success,
    hint,
    className = '',
    required = false,
    ...props
  },
  ref
) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  return (
    <div className={`form-group ${className}`.trim()}>
      {label && (
        <label htmlFor={id} className="form-label">
          {label}
          {required && <span className="form-label__required">*</span>}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        type={type}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        required={required}
        className={`form-input ${error ? 'form-input--error' : success ? 'form-input--success' : ''}`.trim()}
        {...props}
      />
      {error && (
        <p id={errorId} className="form-error" role="alert">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </p>
      )}
      {success && !error && (
        <p className="form-success-msg">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'inline', marginRight: 4 }}>
            <path d="M20 6L9 17l-5-5" />
          </svg>
          {success}
        </p>
      )}
      {hint && !error && !success && (
        <p id={hintId} className="form-hint">{hint}</p>
      )}
    </div>
  );
});

export default AuthInput;

