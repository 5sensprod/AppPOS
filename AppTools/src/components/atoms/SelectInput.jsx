// src/components/fields/SelectInput.jsx
import React from 'react';
import { useFormContext } from 'react-hook-form';

const SelectInput = ({ name, label, options }) => {
  const { register, formState } = useFormContext();
  const error = formState.errors[name];

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </label>
      <select
        {...register(name)}
        className="w-full px-3 py-2 border rounded-md shadow-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
      >
        <option value="">Sélectionner...</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-sm text-red-500 mt-1">{error.message}</p>}
    </div>
  );
};

export default SelectInput;
