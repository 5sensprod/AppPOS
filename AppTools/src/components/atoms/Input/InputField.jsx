// src/components/atoms/Input/InputField.jsx
import React from 'react';
import { useFormContext } from 'react-hook-form';
import BaseInput from './BaseInput';
import {
  getLabelClassName,
  getMessageClassName,
  getReadOnlyClassName,
  getRegisterOptions,
} from './inputStyles';

const InputField = ({
  name,
  label,
  type = 'text',
  placeholder,
  editable = true,
  value,
  size = 'md',
  required = false,
  optional = false,
  helpText,
  className = '',
  icon: Icon,
  iconPosition = 'left',
  // Props spécifiques pour le mode lecture
  readOnlyClassName = '',
  emptyText = 'Non défini',
  showIcon = true,
  // Props pour la validation visuelle
  warningCondition,
  warningMessage,
  // Props de validation
  validationRules = {},
  // Props additionnels pour l'input
  ...inputProps
}) => {
  const formContext = useFormContext();
  const register = formContext?.register;
  const errors = formContext?.formState?.errors;

  const error = errors?.[name];
  const hasError = !!error;

  // Options de register selon le type
  const registerOptions = getRegisterOptions(type, {
    required: required ? `${label || 'Ce champ'} est requis` : false,
    ...validationRules,
  });

  if (!editable) {
    // Mode lecture
    const displayValue = value !== undefined && value !== null && value !== '' ? value : emptyText;

    const hasWarning =
      warningCondition && typeof warningCondition === 'function' ? warningCondition(value) : false;

    const isEmpty = displayValue === emptyText;
    const readOnlyClasses = getReadOnlyClassName({
      hasWarning,
      isEmpty,
      extraClasses: readOnlyClassName,
    });

    return (
      <div className={`${className} ${readOnlyClasses.container}`}>
        {label && (
          <h3 className={readOnlyClasses.label}>
            {showIcon && Icon && <Icon className="inline h-4 w-4 mr-1" />}
            {label}
          </h3>
        )}
        <p className={readOnlyClasses.value}>{displayValue}</p>
        {hasWarning && warningMessage && (
          <p className={getMessageClassName('warning')}>{warningMessage}</p>
        )}
      </div>
    );
  }

  // Mode édition
  const labelClassName = getLabelClassName({ required, optional });

  // Séparer les props HTML des props custom
  const {
    size: _size,
    icon: _icon,
    iconPosition: _iconPosition,
    error: _error,
    ...htmlInputProps
  } = inputProps;

  return (
    <div className={className}>
      {label && (
        <label className={labelClassName}>
          {showIcon && Icon && <Icon className="inline h-4 w-4 mr-1" />}
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
          {optional && <span className="text-gray-400 ml-1 text-xs">(optionnel)</span>}
        </label>
      )}

      <BaseInput
        type={type}
        placeholder={placeholder}
        size={size}
        error={hasError}
        icon={Icon}
        iconPosition={iconPosition}
        {...(register ? register(name, registerOptions) : {})}
        {...htmlInputProps}
      />

      {error && <p className={getMessageClassName('error')}>{error.message}</p>}

      {helpText && !error && <p className={getMessageClassName('help')}>{helpText}</p>}
    </div>
  );
};

export default InputField;
