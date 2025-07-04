//AppTools\src\components\common\fields\BrandSelectField.jsx
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

const BrandSelectField = ({
  name = 'brands', // ✅ CHANGÉ: pluriel par défaut pour les multi-sélections
  options = [],
  editable = false,
  value,
  isMulti = true, // ✅ NOUVEAU: Prop pour gérer le mode multiple
}) => {
  const { control, watch } = useFormContext() || {};
  const selected = watch?.(name) || value || [];

  console.log('🔍 BrandSelectField Debug:', {
    name,
    selected,
    options: options.slice(0, 3), // Afficher seulement les 3 premières options
    isMulti,
    editable,
  });

  // ✅ Tri alphabétique des options
  const sortedOptions = useMemo(() => {
    return [...options].sort((a, b) => a.label.localeCompare(b.label));
  }, [options]);

  if (!editable) {
    // ✅ CORRECTION: Gérer les deux modes (single et multi)
    let selectedOptions = [];

    if (isMulti) {
      // Mode multiple : selected est un tableau d'IDs
      selectedOptions = sortedOptions.filter((opt) =>
        Array.isArray(selected) ? selected.includes(opt.value) : false
      );
    } else {
      // Mode simple : selected est un ID unique
      const selectedOption = sortedOptions.find((opt) => opt.value === selected);
      selectedOptions = selectedOption ? [selectedOption] : [];
    }

    return (
      <div className="space-y-1">
        {selectedOptions.length === 0 ? (
          <p className="text-gray-500 italic">Aucune marque</p>
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
        // ✅ CORRECTION: Gérer les valeurs pour le mode multiple
        let fieldValue = null;

        if (isMulti) {
          // Mode multiple : convertir le tableau d'IDs en tableau d'options
          const selectedIds = Array.isArray(field.value) ? field.value : [];
          fieldValue = sortedOptions.filter((opt) => selectedIds.includes(opt.value));
        } else {
          // Mode simple : trouver l'option correspondante
          fieldValue = sortedOptions.find((opt) => opt.value === field.value) || null;
        }

        return (
          <Select
            {...field}
            options={sortedOptions}
            value={fieldValue}
            onChange={(selected) => {
              if (isMulti) {
                // Mode multiple : extraire les IDs des options sélectionnées
                const selectedIds = selected ? selected.map((opt) => opt.value) : [];
                field.onChange(selectedIds);
                console.log('🔄 BrandSelectField onChange (multi):', selectedIds);
              } else {
                // Mode simple : extraire l'ID de l'option sélectionnée
                const selectedId = selected?.value || '';
                field.onChange(selectedId);
                console.log('🔄 BrandSelectField onChange (single):', selectedId);
              }
            }}
            placeholder={isMulti ? 'Sélectionner des marques' : 'Aucune marque'}
            isClearable
            isMulti={isMulti} // ✅ AJOUT: Activer le mode multiple
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

export default BrandSelectField;
