// AppTools/src/components/atoms/Select/SelectField.jsx
import React from 'react';
import { ChevronDown } from 'lucide-react';
import { sharedClasses, getThemedClasses } from './selectStyles';

const SelectField = ({
  value = '',
  placeholder = 'Sélectionner...',
  isOpen = false,
  disabled = false,
  error = false,
  onClick,
  className = '',
  size = 'md', // 'sm' | 'md' | 'lg'
  theme = 'default', // ⚡ Support des thèmes
}) => {
  // Styles par taille cohérents avec BaseSelect
  const sizeStyles = {
    sm: 'px-2 py-1 text-sm min-h-[32px]',
    md: 'px-3 py-2 text-base min-h-[38px]',
    lg: 'px-4 py-3 text-lg min-h-[44px]',
  };

  // ⚡ NOUVEAU: Support des thèmes
  let fieldClassName;

  if (theme === 'default') {
    // ✅ Garde votre logique existante pour le thème par défaut
    fieldClassName = sharedClasses.input.replace('w-full px-3 py-2', `w-full ${sizeStyles[size]}`);

    // États spéciaux
    if (error) {
      fieldClassName = fieldClassName.replace(
        'focus:ring-blue-500 focus:border-blue-500',
        'focus:ring-red-500 focus:border-red-500 border-red-500'
      );
    } else if (isOpen) {
      fieldClassName = fieldClassName.replace(
        'border-gray-300 dark:border-gray-600',
        'border-blue-500 dark:border-blue-400 ring-2 ring-blue-200'
      );
    }

    if (disabled) {
      fieldClassName += ` ${sharedClasses.disabled}`;
    }
  } else {
    // ⚡ Utilise les thèmes personnalisés
    const themedClasses = getThemedClasses(theme);

    // Base du champ avec thème
    let baseField = `w-full ${sizeStyles[size]} rounded-md shadow-sm focus:outline-none transition-colors`;

    // Appliquer le thème selon l'état
    if (error) {
      baseField += ' border-red-500 focus:ring-red-500 focus:border-red-500 ring-2 ring-red-200';
    } else if (isOpen) {
      // Utiliser les couleurs du thème pour le focus
      if (theme === 'elegant') {
        baseField +=
          ' border-indigo-500 focus:ring-indigo-500 focus:border-indigo-500 ring-2 ring-indigo-200 bg-slate-50 dark:bg-slate-900';
      } else if (theme === 'colorful') {
        baseField +=
          ' border-purple-500 focus:ring-purple-500 focus:border-purple-500 ring-2 ring-purple-200 bg-gradient-to-r from-purple-50 to-pink-50';
      } else if (theme === 'minimal') {
        baseField +=
          ' border-blue-400 focus:ring-blue-400 focus:border-blue-400 ring-2 ring-blue-100 bg-white dark:bg-gray-900 shadow-lg';
      } else {
        baseField +=
          ' border-blue-500 focus:ring-blue-500 focus:border-blue-500 ring-2 ring-blue-200';
      }
    } else {
      // État normal avec couleurs du thème
      if (theme === 'elegant') {
        baseField +=
          ' border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100';
      } else if (theme === 'colorful') {
        baseField +=
          ' border-purple-200 dark:border-purple-700 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 text-purple-900 dark:text-purple-100';
      } else if (theme === 'minimal') {
        baseField +=
          ' border-0 shadow-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100';
      } else {
        baseField +=
          ' border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100';
      }
    }

    if (disabled) {
      baseField += ' opacity-50 cursor-not-allowed';
    }

    fieldClassName = baseField;
  }

  return (
    <div
      className={`${fieldClassName} flex justify-between items-center cursor-pointer ${className}`}
      onClick={() => !disabled && onClick?.()}
    >
      <div className="truncate">
        {value || <span className="text-gray-500 dark:text-gray-400">{placeholder}</span>}
      </div>
      <ChevronDown
        className={`h-5 w-5 text-gray-400 transition-transform flex-shrink-0 ml-2 ${isOpen ? 'transform rotate-180' : ''}`}
      />
    </div>
  );
};

export default SelectField;
