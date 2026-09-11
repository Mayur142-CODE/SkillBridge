import { forwardRef } from 'react';
import { ArrowRight } from 'lucide-react';

const variantClasses = {
  primary: 'btn--primary',
  secondary: 'btn--secondary',
  outline: 'btn--outline',
  'secondary-dark': 'btn--outline',
  ghost: 'btn--ghost',
  'ghost-light': 'btn--ghost-light',
};

const sizeClasses = {
  sm: 'btn--sm',
  md: '',
  lg: 'btn--lg',
};

const Button = forwardRef(function Button(
  {
    children,
    variant = 'primary',
    size = 'md',
    withArrow = false,
    className = '',
    ...props
  },
  ref
) {
  const variantCls = variantClasses[variant] || 'btn--primary';
  const sizeCls = sizeClasses[size] || '';

  return (
    <button
      ref={ref}
      className={`btn ${variantCls} ${sizeCls} ${className}`.trim()}
      {...props}
    >
      {children}
      {withArrow && <ArrowRight size={16} className="btn__arrow" />}
    </button>
  );
});

export default Button;

