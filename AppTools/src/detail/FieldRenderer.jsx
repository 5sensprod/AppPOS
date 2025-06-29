// src/components/detail/FieldRenderer.jsx
import React from 'react';
import TextInput from '../components/atoms/TextInput';
import TextArea from '../components/atoms/TextArea';
import SelectInput from '../components/atoms/SelectInput';
import EmailInput from '../components/atoms/EmailInput';
import NumberInput from '../components/atoms/NumberInput';
import MultiSelectInput from '../components/atoms/MultiSelectInput';
import ImageUpload from '../components/atoms/ImageUpload';
import ImageDisplay from '../components/atoms/ImageDisplay';

const FieldRenderer = ({ fieldConfig, editable, entity = {} }) => {
  console.log('🐛 [FIELD_RENDERER] Debug:', {
    fieldConfig,
    editable,
    entity,
    entityKeys: entity ? Object.keys(entity) : null,
  });

  const {
    name,
    label,
    type = 'text',
    options = [],
    required = false,
    min,
    max,
    step,
    suffix,
    showImages = false,
    placeholder,
    rows,
  } = fieldConfig;

  // Récupérer la valeur depuis l'entité pour l'affichage en lecture
  const getValue = () => {
    const keys = name.split('.');
    let value = entity;
    for (const key of keys) {
      value = value?.[key];
    }
    console.log(`🔍 [FIELD_RENDERER] Valeur pour "${name}":`, value);
    return value;
  };

  // Mode lecture - Affichage optimisé par type
  if (!editable) {
    const value = getValue();

    // Gestion spéciale pour le type image en mode lecture
    if (type === 'image') {
      return (
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
          <ImageDisplay image={value} alt={label} size="medium" editable={false} showInfo={true} />
        </div>
      );
    }

    return (
      <div className="space-y-1">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
        <div className="text-gray-900 dark:text-white">
          {type === 'multiselect' && Array.isArray(value) ? (
            value.length === 0 ? (
              <span className="text-gray-500 italic">Aucun élément sélectionné</span>
            ) : (
              <div className="flex flex-wrap gap-2">
                {value.map((item, idx) => {
                  // Si on a les options, afficher le label correspondant
                  const option = options.find((opt) => opt.value === item);
                  const displayValue = option ? option.label : item;

                  return (
                    <div
                      key={idx}
                      className="inline-flex items-center space-x-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded text-sm"
                    >
                      {showImages && option?.image && (
                        <img
                          src={option.image}
                          alt={displayValue}
                          className="w-4 h-4 object-cover rounded"
                        />
                      )}
                      <span>{displayValue}</span>
                    </div>
                  );
                })}
              </div>
            )
          ) : type === 'select' ? (
            (() => {
              const option = options.find((opt) => opt.value === value);
              return option ? option.label : value || '-';
            })()
          ) : type === 'number' && suffix ? (
            `${value || 0}${suffix}`
          ) : type === 'email' && value ? (
            <a
              href={`mailto:${value}`}
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              {value}
            </a>
          ) : type === 'textarea' ? (
            <div className="whitespace-pre-line">{value || '-'}</div>
          ) : (
            value || '-'
          )}
        </div>
      </div>
    );
  }

  // Mode édition - Utilisation des composants atomiques
  const commonProps = {
    name,
    label,
    placeholder,
    required,
  };

  switch (type) {
    case 'text':
      return <TextInput {...commonProps} />;

    case 'email':
      return <EmailInput {...commonProps} />;

    case 'textarea':
      return <TextArea {...commonProps} rows={rows || 3} />;

    case 'number':
      return <NumberInput {...commonProps} min={min} max={max} step={step || 1} suffix={suffix} />;

    case 'select':
      return <SelectInput {...commonProps} options={options} />;

    case 'multiselect':
      return <MultiSelectInput {...commonProps} options={options} showImages={showImages} />;

    case 'image':
      const currentImage = getValue();
      return (
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>

          {/* Affichage de l'image actuelle */}
          {currentImage?.src && (
            <ImageDisplay
              image={currentImage}
              alt={label}
              size="large"
              editable={true}
              onDelete={() => {
                // Utiliser la fonction globale passée par SupplierDetailV2
                if (window.deleteEntityImage) {
                  window.deleteEntityImage(entity._id);
                } else {
                  console.warn('Fonction deleteEntityImage non disponible');
                }
              }}
              showInfo={true}
            />
          )}

          {/* Upload d'une nouvelle image */}
          <ImageUpload
            onUpload={(file) => {
              // Utiliser la fonction globale passée par SupplierDetailV2
              if (window.uploadEntityImage) {
                return window.uploadEntityImage(entity._id, file);
              } else {
                console.warn('Fonction uploadEntityImage non disponible');
                return Promise.reject(new Error('Fonction upload non disponible'));
              }
            }}
            onError={(error) => {
              console.error('Erreur upload image:', error);
              // Optionnel : vous pouvez ajouter une notification d'erreur ici
            }}
            buttonText={currentImage?.src ? "Remplacer l'image" : 'Ajouter une image'}
            acceptedTypes={['image/jpeg', 'image/png', 'image/gif', 'image/webp']}
            maxFileSize={5 * 1024 * 1024} // 5MB
          />
        </div>
      );

    default:
      return (
        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
          <p className="text-yellow-800 dark:text-yellow-200 text-sm">
            ⚠️ Type de champ non supporté : <strong>{type}</strong>
          </p>
          <p className="text-xs text-yellow-600 dark:text-yellow-300 mt-1">
            Types disponibles : text, email, textarea, number, select, multiselect, image
          </p>
        </div>
      );
  }
};

export default FieldRenderer;
