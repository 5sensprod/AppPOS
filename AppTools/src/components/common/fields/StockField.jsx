// src/components/common/fields/StockField.jsx
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { sharedClasses } from '../../atoms/Select/selectStyles';

const StockField = ({
  name,
  label,
  placeholder,
  editable = false,
  value,
  min = 0,
  step = 1,
  className = '',
  showWarning = false,
  warningThreshold = null,
}) => {
  const formContext = useFormContext();
  const register = formContext?.register;
  const errors = formContext?.formState?.errors;

  const error = errors?.[name];
  const fieldValue = value !== undefined ? value : '';

  if (!editable) {
    // Mode lecture
    const displayValue =
      fieldValue !== undefined && fieldValue !== null && fieldValue !== ''
        ? fieldValue
        : 'Non défini';

    const shouldShowWarning =
      showWarning &&
      warningThreshold !== null &&
      typeof fieldValue === 'number' &&
      fieldValue <= warningThreshold;

    return (
      <div className={className}>
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</h3>
        <p
          className={`mt-1 font-medium ${
            shouldShowWarning
              ? 'text-red-600 dark:text-red-400'
              : 'text-gray-900 dark:text-gray-100'
          }`}
        >
          {displayValue}
        </p>
      </div>
    );
  }

  // Mode édition
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </label>
      <input
        type="number"
        min={min}
        step={step}
        placeholder={placeholder}
        {...register(name, {
          valueAsNumber: true,
          setValueAs: (value) => (value === '' ? undefined : Number(value)),
        })}
        className={`${sharedClasses.input} ${error ? sharedClasses.error : ''}`}
      />
      {error && <p className="mt-1 text-sm text-red-600 dark:text-red-500">{error.message}</p>}
    </div>
  );
};

export default StockField;

// ===== COMPOSANT SPÉCIALISÉ POUR LA CHECKBOX =====

// src/components/common/fields/CheckboxField.jsx
export const CheckboxField = ({
  name,
  label,
  description,
  editable = false,
  value,
  className = '',
}) => {
  const formContext = useFormContext();
  const register = formContext?.register;
  const errors = formContext?.formState?.errors;

  const error = errors?.[name];

  if (!editable) {
    // Mode lecture
    return (
      <div className={className}>
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</h3>
        <p className="mt-1 text-gray-900 dark:text-gray-100">{value ? 'Activé' : 'Désactivé'}</p>
      </div>
    );
  }

  // Mode édition
  return (
    <div className={`flex items-start ${className}`}>
      <label className="inline-flex items-start">
        <input
          type="checkbox"
          {...register(name)}
          className="form-checkbox h-5 w-5 text-blue-600 mt-0.5 rounded border-gray-300 focus:ring-blue-500"
        />
        <div className="ml-2">
          <span className="text-gray-700 dark:text-gray-300 font-medium">{label}</span>
          {description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>
          )}
        </div>
      </label>
      {error && <p className="mt-1 text-sm text-red-600 dark:text-red-500">{error.message}</p>}
    </div>
  );
};
