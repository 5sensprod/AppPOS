// src/components/atoms/Input/TextInput.jsx
import React from 'react';
import InputField from './InputField';

const TextInput = ({
  minLength,
  maxLength,
  pattern,
  autoCapitalize = 'none',
  autoComplete,
  spellCheck = true,
  validationRules = {},
  ...props
}) => {
  // Règles de validation personnalisées
  const textValidationRules = {
    ...validationRules,
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
    pattern: pattern
      ? {
          value: pattern,
          message: 'Format invalide',
        }
      : undefined,
  };

  return (
    <InputField
      type="text"
      minLength={minLength}
      maxLength={maxLength}
      autoCapitalize={autoCapitalize}
      autoComplete={autoComplete}
      spellCheck={spellCheck}
      validationRules={textValidationRules}
      {...props}
    />
  );
};

export default TextInput;
