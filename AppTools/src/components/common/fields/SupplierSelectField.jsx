// src/components/common/fields/SupplierSelectField.jsx
import React, { useMemo } from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import Select from 'react-select';
import imageProxyService from '../../../services/imageProxyService';

const formatOptionLabel = ({ label, image }) => (
  <div className="flex items-center gap-2">
    {image?.src && (
      <img
        src={imageProxyService.getImageUrl(image.src)}
        alt={label}
        className="w-6 h-6 object-cover rounded"
      />
    )}
    <span>{label}</span>
  </div>
);

const SupplierSelectField = ({ name = 'suppliers', options = [], editable = false, value }) => {
  const { control, watch } = useFormContext() || {};
  const selected = watch?.(name) || value || [];

  // ✅ Tri alphabétique des options
  const sortedOptions = useMemo(() => {
    return [...options].sort((a, b) => a.label.localeCompare(b.label));
  }, [options]);

  if (!editable) {
    const selectedOptions = sortedOptions.filter((opt) => selected.includes(opt.value));
    return (
      <div className="space-y-1">
        {selectedOptions.length === 0 ? (
          <p className="text-gray-500 italic">Aucun fournisseur</p>
        ) : (
          selectedOptions.map((opt) => (
            <div key={opt.value} className="flex items-center gap-2">
              {opt.image?.src && (
                <img src={opt.image.src} alt={opt.label} className="w-6 h-6 object-cover rounded" />
              )}
              <span>{opt.label}</span>
            </div>
          ))
        )}
      </div>
    );
  }

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <Select
          {...field}
          isMulti
          options={sortedOptions} // ✅ Utiliser les options triées
          value={sortedOptions.filter((opt) => field.value?.includes(opt.value))}
          onChange={(selected) => field.onChange(selected.map((opt) => opt.value))}
          formatOptionLabel={formatOptionLabel}
          placeholder="Sélectionner des fournisseurs..."
          className="react-select-container"
          classNamePrefix="react-select"
        />
      )}
    />
  );
};

export default SupplierSelectField;
