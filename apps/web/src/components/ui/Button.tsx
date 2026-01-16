'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';

type ButtonVariant = 'primary' | 'outline' | 'ghost';
type ButtonSize = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'btn btn--primary',
  outline: 'btn btn--outline',
  ghost: 'btn btn--ghost',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'text-sm px-3 py-1.5',
  md: 'text-sm px-4 py-2',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'outline', size = 'md', className = '', disabled, children, ...props }, ref) => {
    const baseClasses = variantClasses[variant];
    const sizeClass = sizeClasses[size];
    const disabledClass = disabled ? 'opacity-50 cursor-not-allowed' : '';

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={`${baseClasses} ${sizeClass} ${disabledClass} ${className}`.trim()}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
