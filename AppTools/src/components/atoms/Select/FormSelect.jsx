// src/components/atoms/Select/FormSelect.jsx
import React from 'react';
import BaseSelect from './BaseSelect';

const FormSelect = ({ label, error, required = false, className = '', ...selectProps }) => {
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <BaseSelect
        {...selectProps}
        styles={{
          control: (provided, state) => ({
            ...provided,
            borderColor: error ? '#EF4444' : state.isFocused ? '#3B82F6' : '#D1D5DB',
            boxShadow: error ? '0 0 0 1px #EF4444' : state.isFocused ? '0 0 0 1px #3B82F6' : 'none',
          }),
        }}
      />

      {error && <p className="mt-1 text-sm text-red-600 dark:text-red-500">{error}</p>}
    </div>
  );
};

export default FormSelect;
