import React, { useMemo } from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import Select from 'react-select';

// ✅ Styles modernes tirés de CategoriesSection
const modernSelectStyles = {
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

const BrandSelectField = ({ name = 'brand_id', options = [], editable = false, value }) => {
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
          <p className="text-gray-500 italic">Aucune marque</p>
        ) : (
          selectedOptions.map((opt) => (
            <div key={opt.value} className="flex items-center gap-2">
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
          options={sortedOptions}
          value={sortedOptions.find((opt) => opt.value === field.value) || null}
          onChange={(selected) => field.onChange(selected?.value || '')}
          placeholder="Aucune marque"
          isClearable
          className="react-select-container"
          classNamePrefix="react-select"
          menuPlacement="top"
          menuPortalTarget={document.body}
          styles={modernSelectStyles}
        />
      )}
    />
  );
};

export default BrandSelectField;
