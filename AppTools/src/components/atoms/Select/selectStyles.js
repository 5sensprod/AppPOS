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

export const themes = {
  default: {
    // Votre thème actuel
    container: 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600',
    item: 'hover:bg-gray-50 dark:hover:bg-gray-700',
    selected: 'bg-blue-50 dark:bg-blue-900/20',
    chip: {
      primary: 'bg-blue-100 text-blue-800 border-blue-300',
      secondary: 'bg-gray-100 text-gray-700 border-gray-300',
    },
  },

  elegant: {
    // ⚡ Nouveau thème élégant
    container: 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700',
    item: 'hover:bg-slate-100 dark:hover:bg-slate-800',
    selected: 'bg-indigo-50 dark:bg-indigo-900/30 border-l-4 border-indigo-500',
    chip: {
      primary: 'bg-indigo-100 text-indigo-900 border-indigo-200 shadow-sm',
      secondary: 'bg-slate-100 text-slate-700 border-slate-200 shadow-sm',
    },
  },

  colorful: {
    // ⚡ Thème coloré fun
    container:
      'bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-700',
    item: 'hover:bg-gradient-to-r hover:from-purple-100 hover:to-pink-100 dark:hover:from-purple-800/30 dark:hover:to-pink-800/30',
    selected:
      'bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-800/40 dark:to-pink-800/40 border-l-4 border-gradient-to-b border-purple-500',
    chip: {
      primary:
        'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-900 border-purple-300 shadow-lg',
      secondary:
        'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 border-gray-300 shadow-md',
    },
  },

  minimal: {
    // ⚡ Thème ultra minimal
    container: 'bg-white dark:bg-gray-900 border-0 shadow-2xl',
    item: 'hover:bg-gray-25 dark:hover:bg-gray-850 border-b border-gray-100 dark:border-gray-800',
    selected: 'bg-blue-25 dark:bg-blue-950 border-l-2 border-blue-400',
    chip: {
      primary: 'bg-blue-25 text-blue-900 border-0 shadow-none ring-1 ring-blue-200',
      secondary: 'bg-gray-25 text-gray-800 border-0 shadow-none ring-1 ring-gray-200',
    },
  },
};

// ===== FONCTION: Obtenir les classes selon le thème =====
export const getThemedClasses = (themeName = 'default') => {
  const theme = themes[themeName] || themes.default;

  return {
    // Conteneurs
    dropdownContainer: `${theme.container} rounded-md shadow-lg overflow-hidden`,

    // Items de liste
    listItem: `flex items-center px-3 py-2 cursor-pointer group ${theme.item}`,
    listItemSelected: `${theme.item} ${theme.selected}`,

    // Chips
    chipPrimary: `inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-colors ${theme.chip.primary}`,
    chipSecondary: `inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-colors ${theme.chip.secondary}`,
  };
};

// ===== MISE À JOUR: sharedClasses avec support des thèmes =====
export const getSharedClasses = (themeName = 'default') => {
  const themed = getThemedClasses(themeName);

  return {
    // Classes existantes + thème
    input:
      'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white',

    // Classes thématisées
    dropdownContainer: themed.dropdownContainer,
    listItem: themed.listItem,
    listItemSelected: themed.listItemSelected,
    chipPrimary: themed.chipPrimary,
    chipSecondary: themed.chipSecondary,

    // Boutons (inchangés)
    button: {
      primary:
        'px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500',
      secondary:
        'px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500',
    },
  };
};
