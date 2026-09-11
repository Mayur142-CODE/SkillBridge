import { forwardRef, useState, useId } from 'react';
import { Eye, EyeOff } from 'lucide-react';

const PasswordInput = forwardRef(function PasswordInput(
  { label = 'Password', error, success, hint, className = '', required = false, ...props },
  ref
) {
  const [visible, setVisible] = useState(false);
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className={`form-group ${className}`.trim()}>
      {label && (
        <label htmlFor={id} className="form-label">
          {label}
          {required && <span className="form-label__required">*</span>}
        </label>
      )}
      <div className="password-wrapper">
        <input
          ref={ref}
          id={id}
          type={visible ? 'text' : 'password'}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          required={required}
          className={`form-input ${error ? 'form-input--error' : success ? 'form-input--success' : ''}`.trim()}
          style={{ paddingRight: '40px' }}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          className="password-toggle"
          aria-label={visible ? 'Hide password' : 'Show password'}
          tabIndex={-1}
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
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
      {hint && !error && (
        <p className="form-hint">{hint}</p>
      )}
    </div>
  );
});

export default PasswordInput;

