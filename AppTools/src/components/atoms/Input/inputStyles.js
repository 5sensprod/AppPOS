// src/components/atoms/Input/inputStyles.js

/**
 * Styles unifiés pour tous les composants d'input
 * Similaire à selectStyles.js mais pour les champs de saisie
 */

// ===== STYLES DE BASE =====
export const baseInputStyles = {
  // Input principal
  input:
    'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors',

  // Variants par taille
  inputSm: 'px-2 py-1 text-sm min-h-[32px]',
  inputMd: 'px-3 py-2 text-base min-h-[38px]', // défaut
  inputLg: 'px-4 py-3 text-lg min-h-[44px]',

  // États
  inputError: 'border-red-500 focus:ring-red-500 focus:border-red-500',
  inputSuccess: 'border-green-500 focus:ring-green-500 focus:border-green-500',
  inputWarning: 'border-yellow-500 focus:ring-yellow-500 focus:border-yellow-500',
  inputDisabled: 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800',

  // Labels
  label: 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1',
  labelRequired: 'text-red-500 ml-1',
  labelOptional: 'text-gray-400 ml-1 text-xs',

  // Messages d'aide et d'erreur
  helpText: 'mt-1 text-xs text-gray-500 dark:text-gray-400',
  errorText: 'mt-1 text-sm text-red-600 dark:text-red-500',
  warningText: 'mt-1 text-sm text-yellow-600 dark:text-yellow-500',
  successText: 'mt-1 text-sm text-green-600 dark:text-green-500',

  // Conteneurs
  fieldContainer: 'w-full',
  inputGroup: 'relative',

  // Mode lecture
  readOnlyContainer: 'py-2',
  readOnlyLabel: 'text-sm font-medium text-gray-500 dark:text-gray-400 mb-1',
  readOnlyValue: 'font-medium text-gray-900 dark:text-gray-100',
  readOnlyValueWarning: 'font-medium text-red-600 dark:text-red-400',
  readOnlyEmpty: 'font-medium text-gray-500 dark:text-gray-400 italic',
};

// ===== UTILITAIRES =====

export const getInputClassName = (options = {}) => {
  const {
    size = 'md',
    error = false,
    success = false,
    warning = false,
    disabled = false,
    extraClasses = '',
  } = options;

  let className = baseInputStyles.input;

  // Taille
  if (size === 'sm') className += ` ${baseInputStyles.inputSm}`;
  else if (size === 'lg') className += ` ${baseInputStyles.inputLg}`;
  // md est la taille par défaut

  // États
  if (error) className += ` ${baseInputStyles.inputError}`;
  else if (success) className += ` ${baseInputStyles.inputSuccess}`;
  else if (warning) className += ` ${baseInputStyles.inputWarning}`;

  if (disabled) className += ` ${baseInputStyles.inputDisabled}`;

  return `${className} ${extraClasses}`.trim();
};

export const getLabelClassName = (options = {}) => {
  const { required = false, optional = false, extraClasses = '' } = options;

  let className = baseInputStyles.label;

  return `${className} ${extraClasses}`.trim();
};

export const getMessageClassName = (type = 'help', extraClasses = '') => {
  const messageClasses = {
    help: baseInputStyles.helpText,
    error: baseInputStyles.errorText,
    warning: baseInputStyles.warningText,
    success: baseInputStyles.successText,
  };

  return `${messageClasses[type] || messageClasses.help} ${extraClasses}`.trim();
};

export const getReadOnlyClassName = (options = {}) => {
  const { hasWarning = false, isEmpty = false, extraClasses = '' } = options;

  let valueClass = baseInputStyles.readOnlyValue;

  if (hasWarning) valueClass = baseInputStyles.readOnlyValueWarning;
  else if (isEmpty) valueClass = baseInputStyles.readOnlyEmpty;

  return {
    container: `${baseInputStyles.readOnlyContainer} ${extraClasses}`.trim(),
    label: baseInputStyles.readOnlyLabel,
    value: valueClass,
  };
};

// ===== TYPES D'INPUTS PRÉDÉFINIS =====

export const inputTypes = {
  text: {
    type: 'text',
    defaultProps: {},
  },
  number: {
    type: 'number',
    defaultProps: {
      min: 0,
      step: 1,
    },
  },
  email: {
    type: 'email',
    defaultProps: {
      autoComplete: 'email',
    },
  },
  password: {
    type: 'password',
    defaultProps: {
      autoComplete: 'current-password',
    },
  },
  tel: {
    type: 'tel',
    defaultProps: {
      autoComplete: 'tel',
    },
  },
  url: {
    type: 'url',
    defaultProps: {
      autoComplete: 'url',
    },
  },
  search: {
    type: 'search',
    defaultProps: {},
  },
};

// ===== VALIDATION HELPERS =====

export const getRegisterOptions = (type, customOptions = {}) => {
  const baseOptions = {
    text: {},
    number: {
      valueAsNumber: true,
      setValueAs: (value) => (value === '' ? undefined : Number(value)),
    },
    email: {
      pattern: {
        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
        message: 'Adresse email invalide',
      },
    },
    tel: {
      pattern: {
        value: /^[\d\s\-\+\(\)]+$/,
        message: 'Numéro de téléphone invalide',
      },
    },
    url: {
      pattern: {
        value: /^https?:\/\/.+/,
        message: 'URL invalide (doit commencer par http:// ou https://)',
      },
    },
  };

  return {
    ...(baseOptions[type] || {}),
    ...customOptions,
  };
};
