// src/components/atoms/Input/BaseInput.jsx
import React, { forwardRef } from 'react';
import { getInputClassName } from './inputStyles';

const BaseInput = forwardRef(
  (
    {
      type = 'text',
      size = 'md',
      error = false,
      success = false,
      warning = false,
      disabled = false,
      className = '',
      icon: Icon,
      iconPosition = 'left',
      ...props
    },
    ref
  ) => {
    const inputClassName = getInputClassName({
      size,
      error,
      success,
      warning,
      disabled,
      extraClasses: className,
    });

    // Si pas d'icône, rendu simple
    if (!Icon) {
      return (
        <input ref={ref} type={type} disabled={disabled} className={inputClassName} {...props} />
      );
    }

    // Avec icône
    const iconSizes = {
      sm: 'h-3 w-3',
      md: 'h-4 w-4',
      lg: 'h-5 w-5',
    };

    const iconSize = iconSizes[size] || iconSizes.md;
    const isLeftIcon = iconPosition === 'left';

    const inputWithIconClassName = `${inputClassName} ${isLeftIcon ? 'pl-8' : 'pr-8'}`;

    return (
      <div className="relative">
        <input
          ref={ref}
          type={type}
          disabled={disabled}
          className={inputWithIconClassName}
          {...props}
        />
        <div
          className={`absolute inset-y-0 ${
            isLeftIcon ? 'left-0 pl-2' : 'right-0 pr-2'
          } flex items-center pointer-events-none`}
        >
          <Icon className={`${iconSize} text-gray-400`} />
        </div>
      </div>
    );
  }
);

BaseInput.displayName = 'BaseInput';

export default BaseInput;
