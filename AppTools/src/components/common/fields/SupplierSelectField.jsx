// src/components/common/fields/SupplierSelectField.jsx
import React, { useMemo } from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import Select from 'react-select';

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

const SupplierSelectField = ({
  name = 'supplier_id',
  options = [],
  editable = false,
  value,
  isMulti = null, // null = auto-détection basée sur le nom du champ
}) => {
  const { control, watch } = useFormContext() || {};

  // ✅ Auto-détection du mode multi basée sur le nom du champ
  const shouldBeMulti = useMemo(() => {
    if (isMulti !== null) return isMulti; // Si explicitement défini, l'utiliser

    // Auto-détection : si le nom contient "suppliers" (pluriel), c'est multi
    // si c'est "supplier_id", c'est simple
    return name === 'suppliers' || name.includes('suppliers');
  }, [name, isMulti]);

  const selected = watch?.(name) ?? value ?? (shouldBeMulti ? [] : '');

  const sortedOptions = useMemo(() => {
    return [...options].sort((a, b) => a.label.localeCompare(b.label));
  }, [options]);

  if (!editable) {
    let selectedOptions = [];

    if (shouldBeMulti) {
      // Mode multi : selected est un tableau d'IDs
      const selectedIds = Array.isArray(selected) ? selected : [];
      selectedOptions = sortedOptions.filter((opt) => selectedIds.includes(opt.value));
    } else {
      // Mode simple : selected est un ID string
      const selectedOption = sortedOptions.find((opt) => opt.value === selected);
      selectedOptions = selectedOption ? [selectedOption] : [];
    }

    return (
      <div className="space-y-1">
        {selectedOptions.length === 0 ? (
          <p className="text-gray-500 italic">
            {shouldBeMulti ? 'Aucun fournisseur' : 'Aucun fournisseur'}
          </p>
        ) : (
          selectedOptions.map((opt) => (
            <div key={opt.value} className="flex items-center gap-2 border px-2 py-1 rounded">
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
      render={({ field }) => {
        let fieldValue = null;

        if (shouldBeMulti) {
          // Mode multi : la valeur est un tableau d'IDs
          const selectedIds = Array.isArray(field.value) ? field.value : [];
          fieldValue = sortedOptions.filter((opt) => selectedIds.includes(opt.value));
        } else {
          // Mode simple : la valeur est un ID string
          fieldValue = sortedOptions.find((opt) => opt.value === field.value) || null;
        }

        return (
          <Select
            {...field}
            options={sortedOptions}
            value={fieldValue}
            onChange={(selected) => {
              if (shouldBeMulti) {
                // Mode multi : retourner un tableau d'IDs
                const selectedIds = selected ? selected.map((opt) => opt.value) : [];
                field.onChange(selectedIds);
              } else {
                // Mode simple : retourner un ID string ou une chaîne vide
                const selectedId = selected?.value || '';
                field.onChange(selectedId);
              }
            }}
            placeholder={
              shouldBeMulti ? 'Sélectionner des fournisseurs' : 'Sélectionner un fournisseur'
            }
            isClearable
            isMulti={shouldBeMulti}
            className="react-select-container"
            classNamePrefix="react-select"
            menuPlacement="top"
            menuPortalTarget={document.body}
            styles={modernSelectStyles}
          />
        );
      }}
    />
  );
};

export default SupplierSelectField;
