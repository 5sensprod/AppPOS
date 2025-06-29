// src/components/atoms/EmailInput.jsx
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Mail } from 'lucide-react';

const EmailInput = ({
  name,
  label,
  placeholder,
  required = false,
  disabled = false,
  className = '',
}) => {
  const {
    register,
    formState: { errors },
  } = useFormContext();
  const error = errors[name];

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label
          htmlFor={name}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Mail className="h-4 w-4 text-gray-400" />
        </div>

        <input
          id={name}
          type="email"
          {...register(name, {
            required: required ? `${label || 'Ce champ'} est obligatoire` : false,
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: 'Adresse email invalide',
            },
          })}
          placeholder={placeholder || `Entrez ${label?.toLowerCase() || "l'email"}...`}
          disabled={disabled}
          className={`
            w-full pl-10 pr-3 py-2 border rounded-md shadow-sm 
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed
            dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400
            dark:focus:ring-blue-400 dark:focus:border-blue-400
            ${
              error
                ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                : 'border-gray-300 dark:border-gray-600'
            }
          `}
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-500 flex items-center">
          <span className="mr-1">⚠️</span>
          {error.message}
        </p>
      )}
    </div>
  );
};

export default EmailInput;
