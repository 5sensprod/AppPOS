// src/components/atoms/Select/selectStyles.js

/**
 * Styles unifiés pour tous les composants de sélection
 * Utilisables par BaseSelect ET CategorySelector
 */

// ===== STYLES DE BASE =====
export const baseSelectStyles = {
  control: (provided, state) => ({
    ...provided,
    minHeight: '38px',
    borderColor: state.isFocused ? '#3B82F6' : '#D1D5DB',
    boxShadow: state.isFocused ? '0 0 0 1px #3B82F6' : 'none',
    '&:hover': {
      borderColor: '#9CA3AF',
    },
  }),
  valueContainer: (provided) => ({
    ...provided,
    padding: '2px 8px',
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected ? '#3B82F6' : state.isFocused ? '#F3F4F6' : 'white',
    color: state.isSelected ? 'white' : '#374151',
    padding: '8px 12px',
    fontSize: '14px',
    ':active': {
      backgroundColor: '#3B82F6',
    },
  }),
  menuPortal: (base) => ({
    ...base,
    zIndex: 9999,
  }),
  menu: (provided) => ({
    ...provided,
    zIndex: 9999,
  }),
};

// ===== CLASSES CSS COMMUNES =====
export const sharedClasses = {
  // Inputs et champs
  input:
    'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white',

  // Conteneurs
  dropdownContainer:
    'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg overflow-hidden',

  // Boutons
  button: {
    primary:
      'px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500',
    secondary:
      'px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500',
    action: 'p-1 rounded-full transition-colors',
  },

  // Items et options
  listItem:
    'flex items-center px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer group',
  listItemSelected: 'bg-blue-50 dark:bg-blue-900/20',

  // Chips et badges
  chip: 'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-colors',
  chipPrimary:
    'bg-blue-100 text-blue-800 border-2 border-blue-300 dark:bg-blue-800 dark:text-blue-100',
  chipSecondary:
    'bg-gray-100 text-gray-700 border border-gray-300 dark:bg-gray-700 dark:text-gray-300',

  // États
  selected: 'bg-blue-50 dark:bg-blue-900/20',
  disabled: 'opacity-50 cursor-not-allowed',
  error: 'border-red-500 focus:ring-red-500 focus:border-red-500',
};

// ===== UTILITAIRES DE STYLE =====
export const createSelectStyles = (customStyles = {}) => ({
  ...baseSelectStyles,
  ...customStyles,
});

export const getChipClassName = (isPrimary = false, extraClasses = '') => {
  const baseClass = sharedClasses.chip;
  const typeClass = isPrimary ? sharedClasses.chipPrimary : sharedClasses.chipSecondary;
  return `${baseClass} ${typeClass} ${extraClasses}`.trim();
};

export const getListItemClassName = (isSelected = false, extraClasses = '') => {
  const baseClass = sharedClasses.listItem;
  const selectedClass = isSelected ? sharedClasses.listItemSelected : '';
  return `${baseClass} ${selectedClass} ${extraClasses}`.trim();
};

export const getFieldClassName = (isOpen = false, error = false, disabled = false, size = 'md') => {
  const sizeStyles = {
    sm: 'px-2 py-1 text-sm min-h-[32px]',
    md: 'px-3 py-2 text-base min-h-[38px]',
    lg: 'px-4 py-3 text-lg min-h-[44px]',
  };

  let className = sharedClasses.input.replace('w-full px-3 py-2', `w-full ${sizeStyles[size]}`);

  if (error) {
    className = className.replace(
      'focus:ring-blue-500 focus:border-blue-500',
      'focus:ring-red-500 focus:border-red-500 border-red-500'
    );
  } else if (isOpen) {
    className = className.replace(
      'border-gray-300 dark:border-gray-600',
      'border-blue-500 dark:border-blue-400 ring-2 ring-blue-200'
    );
  }

  if (disabled) {
    className += ` ${sharedClasses.disabled}`;
  }

  return className;
};

export const getDropdownClassName = (
  position = 'absolute',
  zIndex = 'z-10',
  maxHeight = 'max-h-72',
  extraClasses = ''
) => {
  return `${position} ${zIndex} mt-1 w-full ${sharedClasses.dropdownContainer} ${maxHeight} ${extraClasses}`.trim();
};
