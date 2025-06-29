// src/components/atoms/TextInput.jsx
import React from 'react';
import { useFormContext } from 'react-hook-form';

const TextInput = ({ name, label }) => {
  const { register, formState } = useFormContext();
  const error = formState.errors[name];

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </label>
      <input
        {...register(name)}
        type="text"
        className="w-full px-3 py-2 border rounded-md shadow-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
      />
      {error && <p className="text-sm text-red-500 mt-1">{error.message}</p>}
    </div>
  );
};

export default TextInput;
