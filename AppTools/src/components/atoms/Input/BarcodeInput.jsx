// src/components/atoms/Input/BarcodeInput.jsx
import React, { useState } from 'react';
import { Barcode } from 'lucide-react';
import { getInputClassName, getLabelClassName, getMessageClassName } from './inputStyles';

const BarcodeInput = ({
  label = 'Code-barres',
  value = '',
  onChange,
  onGenerate,
  isGenerating = false,
  validateFn,
  formatFn,
  placeholder = 'Ex: 2001234567890',
  maxLength = 13,
  className = '',
  disabled = false,
  size = 'md',
  showGenerateButton = true,
  helpText,
  ...inputProps
}) => {
  const [localValue, setLocalValue] = useState(value);

  // Utiliser la valeur contrôlée ou locale
  const currentValue = value !== undefined ? value : localValue;
  const isValid = validateFn ? validateFn(currentValue) : true;

  const handleChange = (e) => {
    const newValue = e.target.value;

    if (value === undefined) {
      setLocalValue(newValue); // Mode non contrôlé
    }

    if (onChange) {
      onChange(e);
    }
  };

  const handleGenerate = () => {
    if (onGenerate && !isGenerating) {
      onGenerate();
    }
  };

  const inputClassName = getInputClassName({
    size,
    error: !isValid && currentValue,
    disabled,
  });

  const labelClassName = getLabelClassName();

  // Messages d'aide dynamiques
  const dynamicHelpText = React.useMemo(() => {
    if (helpText) return helpText;

    if (currentValue && isValid && formatFn) {
      return `Formaté: ${formatFn(currentValue)}`;
    }

    if (!currentValue) {
      return showGenerateButton
        ? 'Entrez un code ou générez-en un automatiquement'
        : 'Entrez un code-barres valide';
    }

    return null;
  }, [currentValue, isValid, formatFn, helpText, showGenerateButton]);

  return (
    <div className={className}>
      {/* Label */}
      {label && (
        <label className={labelClassName}>
          <Barcode className="inline h-4 w-4 mr-1" />
          {label}
        </label>
      )}

      {/* Input avec bouton générer */}
      <div className="flex space-x-2">
        <input
          type="text"
          value={currentValue}
          onChange={handleChange}
          placeholder={placeholder}
          maxLength={maxLength}
          disabled={disabled}
          className={`flex-1 ${inputClassName}`}
          {...inputProps}
        />

        {showGenerateButton && (
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating || disabled}
            className="flex items-center justify-center px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Générer automatiquement"
          >
            {isGenerating ? (
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
            ) : (
              <Barcode className="h-4 w-4" />
            )}
            <span className="ml-1">Générer</span>
          </button>
        )}
      </div>

      {/* Messages d'erreur */}
      {!isValid && currentValue && (
        <p className={getMessageClassName('error')}>Code invalide (vérifiez la clé de contrôle)</p>
      )}

      {/* Texte d'aide */}
      {dynamicHelpText && !(!isValid && currentValue) && (
        <p className={getMessageClassName('help')}>{dynamicHelpText}</p>
      )}
    </div>
  );
};

export default BarcodeInput;
