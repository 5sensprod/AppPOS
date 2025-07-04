// src/components/common/fields/SupplierSelectField.jsx
import React, { useMemo } from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import { BaseSelect } from '../../atoms/Select';

const SupplierSelectField = ({
  name = 'supplier_id',
  options = [],
  editable = false,
  value,
  isMulti = null, // null = auto-détection
}) => {
  const { control, watch } = useFormContext() || {};

  // ✅ Auto-détection du mode multi
  const shouldBeMulti = useMemo(() => {
    if (isMulti !== null) return isMulti;
    return name === 'suppliers' || name.includes('suppliers');
  }, [name, isMulti]);

  const selected = watch?.(name) ?? value ?? (shouldBeMulti ? [] : '');

  // ✅ Tri alphabétique simple
  const sortedOptions = useMemo(() => {
    return [...options].sort((a, b) => a.label.localeCompare(b.label));
  }, [options]);

  if (!editable) {
    // Mode lecture simple
    let selectedOptions = [];

    if (shouldBeMulti) {
      const selectedIds = Array.isArray(selected) ? selected : [];
      selectedOptions = sortedOptions.filter((opt) => selectedIds.includes(opt.value));
    } else {
      const selectedOption = sortedOptions.find((opt) => opt.value === selected);
      selectedOptions = selectedOption ? [selectedOption] : [];
    }

    return (
      <div className="space-y-1">
        {selectedOptions.length === 0 ? (
          <p className="text-gray-500 italic">Aucun fournisseur</p>
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

  // Mode édition avec atome
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => {
        let fieldValue = null;

        if (shouldBeMulti) {
          const selectedIds = Array.isArray(field.value) ? field.value : [];
          fieldValue = sortedOptions.filter((opt) => selectedIds.includes(opt.value));
        } else {
          fieldValue = sortedOptions.find((opt) => opt.value === field.value) || null;
        }

        return (
          <BaseSelect
            options={sortedOptions}
            value={fieldValue}
            onChange={(selected) => {
              if (shouldBeMulti) {
                const selectedIds = selected ? selected.map((opt) => opt.value) : [];
                field.onChange(selectedIds);
              } else {
                const selectedId = selected?.value || '';
                field.onChange(selectedId);
              }
            }}
            placeholder={
              shouldBeMulti ? 'Sélectionner des fournisseurs' : 'Sélectionner un fournisseur'
            }
            isMulti={shouldBeMulti}
            isClearable={true}
          />
        );
      }}
    />
  );
};

export default SupplierSelectField;
