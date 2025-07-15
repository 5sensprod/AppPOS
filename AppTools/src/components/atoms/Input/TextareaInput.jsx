// src/components/atoms/Input/TextareaInput.jsx
import React from 'react';
import { useFormContext } from 'react-hook-form';
import {
  getLabelClassName,
  getMessageClassName,
  getReadOnlyClassName,
  getRegisterOptions,
  baseInputStyles,
} from './inputStyles';

const TextareaInput = ({
  name,
  label,
  placeholder,
  editable = true,
  value,
  rows = 4,
  cols,
  minLength,
  maxLength,
  resize = 'vertical', // 'none', 'both', 'horizontal', 'vertical'
  required = false,
  optional = false,
  helpText,
  className = '',
  icon: Icon,
  // Props spécifiques pour le mode lecture
  readOnlyClassName = '',
  emptyText = 'Aucune description',
  showIcon = true,
  // Props de validation
  validationRules = {},
  // Props additionnels pour le textarea
  ...textareaProps
}) => {
  const formContext = useFormContext();
  const register = formContext?.register;
  const errors = formContext?.formState?.errors;

  const error = errors?.[name];
  const hasError = !!error;

  // Options de register avec validation textarea
  const registerOptions = getRegisterOptions('text', {
    required: required ? `${label || 'Ce champ'} est requis` : false,
    minLength: minLength
      ? {
          value: minLength,
          message: `Minimum ${minLength} caractères requis`,
        }
      : undefined,
    maxLength: maxLength
      ? {
          value: maxLength,
          message: `Maximum ${maxLength} caractères autorisés`,
        }
      : undefined,
    ...validationRules,
  });

  if (!editable) {
    // Mode lecture avec style cohérent
    const displayValue = value !== undefined && value !== null && value !== '' ? value : emptyText;

    const isEmpty = displayValue === emptyText;
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
          // Style pour champ vide - même que les autres inputs
          <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-md min-h-[60px] flex items-center">
            <span className="text-gray-500 dark:text-gray-400 italic text-sm">{displayValue}</span>
          </div>
        ) : (
          // Style pour champ rempli - chip coloré
          <div className="px-3 py-2 rounded-lg border bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-700 min-h-[60px]">
            <div className="font-medium whitespace-pre-line">{displayValue}</div>
          </div>
        )}
      </div>
    );
  }

  // Mode édition
  const labelClassName = getLabelClassName({ required, optional });

  // Classes pour le textarea
  const textareaClassName = `
    ${baseInputStyles.input}
    ${hasError ? baseInputStyles.inputError : ''}
    resize-${resize}
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

      <textarea
        placeholder={placeholder}
        rows={rows}
        cols={cols}
        minLength={minLength}
        maxLength={maxLength}
        className={textareaClassName}
        {...register(name, registerOptions)}
        {...textareaProps}
      />

      {/* Compteur de caractères si maxLength défini */}
      {maxLength && (
        <div className="flex justify-between mt-1">
          <div />
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formContext?.watch
              ? `${(formContext.watch(name) || '').length}/${maxLength}`
              : `0/${maxLength}`}
          </span>
        </div>
      )}

      {error && <p className={getMessageClassName('error')}>{error.message}</p>}

      {helpText && !error && <p className={getMessageClassName('help')}>{helpText}</p>}
    </div>
  );
};

export default TextareaInput;
