// src/components/atoms/Input/SelectField.jsx
import React from 'react';
import { useFormContext } from 'react-hook-form';
import {
  getLabelClassName,
  getMessageClassName,
  getReadOnlyClassName,
  getRegisterOptions,
  baseInputStyles,
} from './inputStyles';

const SelectField = ({
  name,
  label,
  options = [],
  placeholder = 'Sélectionner...',
  editable = true,
  value,
  onChange,
  required = false,
  optional = false,
  helpText,
  className = '',
  icon: Icon,
  // Props spécifiques pour le mode lecture
  readOnlyClassName = '',
  emptyText = 'Non sélectionné',
  showIcon = true,
  // Props de validation
  validationRules = {},
  // Props additionnels pour le select
  ...selectProps
}) => {
  const formContext = useFormContext();
  const register = formContext?.register;
  const errors = formContext?.formState?.errors;

  const error = errors?.[name];
  const hasError = !!error;

  // Options de register
  const registerOptions = getRegisterOptions('text', {
    required: required ? `${label || 'Ce champ'} est requis` : false,
    ...validationRules,
  });

  // Pour le mode contrôlé (avec onChange custom)
  const isControlled = onChange !== undefined;

  if (!editable) {
    // Mode lecture avec style cohérent
    const selectedOption = options.find((opt) => opt.value === value);
    const displayValue = selectedOption ? selectedOption.label : value || emptyText;
    const isEmpty = !selectedOption && !value;

    const readOnlyClasses = getReadOnlyClassName({
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
        {isEmpty ? (
          <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-md">
            <span className="text-gray-500 dark:text-gray-400 italic text-sm">{displayValue}</span>
          </div>
        ) : (
          <div className="inline-flex items-center px-3 py-2 rounded-lg border bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-700">
            <span className="font-medium">{displayValue}</span>
          </div>
        )}
      </div>
    );
  }

  // Mode édition
  const labelClassName = getLabelClassName({ required, optional });

  const selectClassName = `
    ${baseInputStyles.input}
    ${hasError ? baseInputStyles.inputError : ''}
  `.trim();

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

      <select
        className={selectClassName}
        {...(isControlled
          ? {
              value: value || '',
              onChange,
            }
          : {
              ...register(name, registerOptions),
            })}
        {...selectProps}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {error && <p className={getMessageClassName('error')}>{error.message}</p>}

      {helpText && !error && <p className={getMessageClassName('help')}>{helpText}</p>}
    </div>
  );
};

export default SelectField;
