// src/components/atoms/MultiSelectInput.jsx
import React, { useState } from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import { ChevronDown, X, Check } from 'lucide-react';

const MultiSelectInput = ({
  name,
  label,
  placeholder = 'Sélectionner...',
  options = [],
  required = false,
  disabled = false,
  showImages = false,
  className = '',
}) => {
  const {
    control,
    formState: { errors },
  } = useFormContext();
  const [isOpen, setIsOpen] = useState(false);
  const error = errors[name];

  const renderOption = (option, isSelected) => (
    <div className="flex items-center space-x-2 w-full">
      {showImages && option.image && (
        <img
          src={option.image}
          alt={option.label}
          className="w-6 h-6 object-cover rounded flex-shrink-0"
        />
      )}
      <span className="truncate flex-1">{option.label}</span>
      {isSelected && <Check className="h-4 w-4 text-blue-600 flex-shrink-0" />}
    </div>
  );

  const renderSelectedItems = (selectedValues) => {
    if (!selectedValues || selectedValues.length === 0) {
      return <span className="text-gray-500">{placeholder}</span>;
    }

    if (selectedValues.length === 1) {
      const option = options.find((opt) => opt.value === selectedValues[0]);
      return option ? (
        <div className="flex items-center space-x-2">
          {showImages && option.image && (
            <img src={option.image} alt={option.label} className="w-5 h-5 object-cover rounded" />
          )}
          <span className="truncate">{option.label}</span>
        </div>
      ) : (
        selectedValues[0]
      );
    }

    return (
      <div className="flex items-center space-x-1">
        <span className="truncate">
          {selectedValues.length} élément{selectedValues.length > 1 ? 's' : ''} sélectionné
          {selectedValues.length > 1 ? 's' : ''}
        </span>
      </div>
    );
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <Controller
        name={name}
        control={control}
        rules={{
          required: required ? `${label || 'Ce champ'} est obligatoire` : false,
        }}
        render={({ field }) => (
          <div className="relative">
            {/* Bouton principal */}
            <button
              type="button"
              onClick={() => !disabled && setIsOpen(!isOpen)}
              disabled={disabled}
              className={`
                w-full px-3 py-2 border rounded-md shadow-sm text-left
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed
                dark:bg-gray-700 dark:border-gray-600 dark:text-white
                dark:focus:ring-blue-400 dark:focus:border-blue-400
                ${
                  error
                    ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-300 dark:border-gray-600'
                }
                flex items-center justify-between
              `}
            >
              <div className="flex-1 min-w-0">{renderSelectedItems(field.value || [])}</div>
              <ChevronDown
                className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Dropdown */}
            {isOpen && !disabled && (
              <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
                {options.length === 0 ? (
                  <div className="px-3 py-2 text-gray-500 dark:text-gray-400">
                    Aucune option disponible
                  </div>
                ) : (
                  options.map((option) => {
                    const isSelected = field.value?.includes(option.value) || false;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        className={`
                          w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-600
                          ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                          flex items-center space-x-2
                        `}
                        onClick={() => {
                          const currentValues = field.value || [];
                          const newValues = isSelected
                            ? currentValues.filter((v) => v !== option.value)
                            : [...currentValues, option.value];
                          field.onChange(newValues);
                        }}
                      >
                        {renderOption(option, isSelected)}
                      </button>
                    );
                  })
                )}
              </div>
            )}

            {/* Overlay pour fermer */}
            {isOpen && <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />}
          </div>
        )}
      />

      {/* Tags des éléments sélectionnés */}
      <Controller
        name={name}
        control={control}
        render={({ field }) => {
          const selectedValues = field.value || [];
          const selectedOptions = options.filter((opt) => selectedValues.includes(opt.value));

          if (selectedOptions.length === 0) return null;

          return (
            <div className="flex flex-wrap gap-2">
              {selectedOptions.map((option) => (
                <div
                  key={option.value}
                  className="inline-flex items-center space-x-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-md text-sm"
                >
                  {showImages && option.image && (
                    <img
                      src={option.image}
                      alt={option.label}
                      className="w-4 h-4 object-cover rounded"
                    />
                  )}
                  <span className="truncate max-w-[100px]">{option.label}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const newValues = selectedValues.filter((v) => v !== option.value);
                      field.onChange(newValues);
                    }}
                    className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded p-0.5"
                    disabled={disabled}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          );
        }}
      />

      {error && (
        <p className="text-sm text-red-600 dark:text-red-500 flex items-center">
          <span className="mr-1">⚠️</span>
          {error.message}
        </p>
      )}
    </div>
  );
};

export default MultiSelectInput;
