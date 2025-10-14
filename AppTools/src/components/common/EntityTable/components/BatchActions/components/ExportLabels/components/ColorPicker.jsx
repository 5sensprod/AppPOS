// ColorPicker.jsx
// Emplacement: AppTools/src/components/common/EntityTable/components/BatchActions/components/ExportLabels/components/ColorPicker.jsx

import React, { useState, useRef, useEffect } from 'react';
import { Palette, RotateCcw } from 'lucide-react';

/**
 * Composant ColorPicker réutilisable avec picker natif et palette prédéfinie
 *
 * @param {string} label - Label affiché au-dessus du picker
 * @param {string} value - Couleur actuelle (format #RRGGBB)
 * @param {function} onChange - Callback appelé au changement de couleur
 * @param {string} defaultColor - Couleur par défaut pour le reset
 * @param {boolean} disabled - Désactive le picker
 */
const ColorPicker = ({ label, value, onChange, defaultColor = '#000000', disabled = false }) => {
  const [showPicker, setShowPicker] = useState(false);
  const [tempColor, setTempColor] = useState(value);
  const pickerRef = useRef(null);

  // Palette de couleurs prédéfinies courantes
  const PRESET_COLORS = [
    '#000000',
    '#FFFFFF',
    '#FF0000',
    '#00FF00',
    '#0000FF',
    '#FFFF00',
    '#FF00FF',
    '#00FFFF',
    '#FF8800',
    '#8800FF',
    '#666666',
    '#999999',
    '#CC0000',
    '#00CC00',
    '#0000CC',
  ];

  // Fermer le picker au clic extérieur
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setShowPicker(false);
      }
    };

    if (showPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showPicker]);

  // Synchroniser tempColor avec value externe
  useEffect(() => {
    setTempColor(value);
  }, [value]);

  const handleColorChange = (newColor) => {
    setTempColor(newColor);
    onChange(newColor);
  };

  const handleReset = () => {
    handleColorChange(defaultColor);
  };

  return (
    <div className="relative">
      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">{label}</label>

      <div className="flex items-center gap-2">
        {/* Bouton principal avec aperçu couleur */}
        <button
          type="button"
          onClick={() => !disabled && setShowPicker(!showPicker)}
          disabled={disabled}
          className={`
            relative flex items-center gap-2 px-3 py-2 rounded-lg border
            ${
              disabled
                ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-50'
                : 'bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer'
            }
            border-gray-300 dark:border-gray-600
            transition-colors
          `}
        >
          {/* Aperçu de la couleur */}
          <div
            className="w-6 h-6 rounded border-2 border-gray-300 dark:border-gray-500"
            style={{ backgroundColor: value }}
          />

          {/* Code couleur */}
          <span className="text-xs font-mono text-gray-700 dark:text-gray-300 min-w-[65px]">
            {value.toUpperCase()}
          </span>

          <Palette className="h-4 w-4 text-gray-400" />
        </button>

        {/* Bouton reset */}
        {value !== defaultColor && (
          <button
            type="button"
            onClick={handleReset}
            disabled={disabled}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Réinitialiser"
          >
            <RotateCcw className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          </button>
        )}
      </div>

      {/* Picker déroulant */}
      {showPicker && (
        <div
          ref={pickerRef}
          className="absolute z-50 mt-2 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-600"
          style={{ minWidth: '240px' }}
        >
          {/* Color picker natif HTML5 */}
          <div className="mb-3">
            <input
              type="color"
              value={tempColor}
              onChange={(e) => handleColorChange(e.target.value)}
              className="w-full h-10 rounded cursor-pointer border border-gray-300 dark:border-gray-600"
            />
          </div>

          {/* Input texte pour code hexa */}
          <div className="mb-3">
            <input
              type="text"
              value={tempColor}
              onChange={(e) => {
                const color = e.target.value;
                // Validation format hexadécimal
                if (/^#[0-9A-Fa-f]{0,6}$/.test(color)) {
                  setTempColor(color);
                  // Appliquer seulement si format valide complet
                  if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
                    onChange(color);
                  }
                }
              }}
              placeholder="#000000"
              className="w-full px-3 py-2 text-sm font-mono border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          {/* Palette prédéfinie */}
          <div className="border-t border-gray-200 dark:border-gray-600 pt-3">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Couleurs rapides</div>
            <div className="grid grid-cols-5 gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => handleColorChange(color)}
                  className={`
                    w-8 h-8 rounded border-2 transition-transform hover:scale-110
                    ${
                      tempColor.toUpperCase() === color.toUpperCase()
                        ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800'
                        : 'border-gray-300 dark:border-gray-600'
                    }
                  `}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ColorPicker;
