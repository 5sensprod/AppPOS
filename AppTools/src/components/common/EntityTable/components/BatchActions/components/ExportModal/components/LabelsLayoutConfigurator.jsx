// AppTools\src\components\common\EntityTable\components\BatchActions\components\ExportModal\components\LabelsLayoutConfigurator.jsx
import React, { useState } from 'react';
import { Grid, Settings, Eye, Palette } from 'lucide-react';

const LabelsLayoutConfigurator = ({ orientation = 'portrait', onLayoutChange, labelData = [] }) => {
  // ✅ CONFIGURATION PERSONNALISÉE UNIQUEMENT (valeurs de votre image 2)
  const [customLayout, setCustomLayout] = useState({
    width: 48.5,
    height: 25,
    offsetTop: 22,
    offsetLeft: 8,
    spacingV: 0,
    spacingH: 0,
  });

  // ✅ STYLES D'ÉTIQUETTES (par défaut : seulement prix et code-barres)
  const [labelStyle, setLabelStyle] = useState({
    fontSize: 12,
    fontFamily: 'Arial',
    showBorder: false, // ✅ Désactivé par défaut
    borderWidth: 1,
    borderColor: '#000000',
    padding: 2,
    alignment: 'center',
    showBarcode: true, // ✅ Activé par défaut
    barcodeHeight: 15,
    showPrice: true, // ✅ Activé par défaut
    priceSize: 14,
    showName: false, // ✅ Désactivé par défaut
    nameSize: 10,
  });

  const handleCustomLayoutChange = (field, value) => {
    const newLayout = { ...customLayout, [field]: parseFloat(value) || 0 };
    setCustomLayout(newLayout);

    if (onLayoutChange) {
      onLayoutChange({
        preset: 'custom',
        layout: newLayout,
        style: labelStyle,
      });
    }
  };

  const handleStyleChange = (newStyle) => {
    setLabelStyle((prev) => ({ ...prev, ...newStyle }));
    if (onLayoutChange) {
      onLayoutChange({
        preset: 'custom',
        layout: customLayout,
        style: { ...labelStyle, ...newStyle },
      });
    }
  };

  // ✅ APERÇU TAILLE RÉELLE
  const renderLabelPreview = () => {
    if (labelData.length === 0) return null;

    const sampleLabel = labelData[0];
    const mmToPx = 3.779527559; // Conversion mm vers pixels (96 DPI)

    const previewWidth = customLayout.width * mmToPx;
    const previewHeight = customLayout.height * mmToPx;

    return (
      <div className="bg-white border border-gray-300 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">
          Aperçu taille réelle ({customLayout.width}×{customLayout.height}mm)
        </h4>
        <div
          className="relative bg-white border border-gray-400 flex flex-col items-center justify-center text-center p-1"
          style={{
            width: `${previewWidth}px`,
            height: `${previewHeight}px`,
            fontSize: `${labelStyle.nameSize}px`,
            border: labelStyle.showBorder
              ? `${labelStyle.borderWidth}px solid ${labelStyle.borderColor}`
              : 'none',
          }}
        >
          {/* Nom du produit */}
          {labelStyle.showName && (
            <div
              className="font-bold text-gray-900 leading-tight"
              style={{ fontSize: `${labelStyle.nameSize}px` }}
            >
              {sampleLabel.name}
            </div>
          )}

          {/* Prix */}
          {labelStyle.showPrice && (
            <div
              className="font-bold text-gray-900 mt-1"
              style={{ fontSize: `${labelStyle.priceSize}px` }}
            >
              {sampleLabel.price.toFixed(2)} €
            </div>
          )}

          {/* Code-barres simulé */}
          {labelStyle.showBarcode && sampleLabel.barcode && (
            <div className="mt-1">
              <div
                className="bg-gray-900 flex"
                style={{ height: `${labelStyle.barcodeHeight}px`, width: '80%' }}
              >
                {/* Simulation de barres */}
                {Array.from({ length: 30 }).map((_, i) => (
                  <div
                    key={i}
                    className={i % 2 === 0 ? 'bg-black' : 'bg-white'}
                    style={{ width: '2px', height: '100%' }}
                  />
                ))}
              </div>
              <div className="text-xs mt-1" style={{ fontSize: '8px' }}>
                {sampleLabel.barcode}
              </div>
            </div>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Dimensions: {customLayout.width} × {customLayout.height} mm
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-4 bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
      <div className="flex items-center space-x-2 mb-3">
        <Grid className="h-5 w-5 text-blue-600" />
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Configuration des étiquettes
        </h3>
      </div>

      {/* ✅ CONFIGURATION (exactement comme votre image 2) */}
      <div className="bg-white dark:bg-gray-800 rounded-md p-3 border border-gray-200 dark:border-gray-600">
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center">
          <Settings className="h-4 w-4 mr-2" />
          Configuration
        </h4>

        <div className="grid grid-cols-2 gap-3">
          {/* Largeur et Hauteur Cellule */}
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
              Largeur Cellule (mm)
            </label>
            <input
              type="number"
              step="0.1"
              value={customLayout.width}
              onChange={(e) => handleCustomLayoutChange('width', e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
              Hauteur Cellule (mm)
            </label>
            <input
              type="number"
              step="0.1"
              value={customLayout.height}
              onChange={(e) => handleCustomLayoutChange('height', e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700"
            />
          </div>

          {/* Offset Haut et Gauche */}
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
              Offset Haut (mm)
            </label>
            <input
              type="number"
              step="0.1"
              value={customLayout.offsetTop}
              onChange={(e) => handleCustomLayoutChange('offsetTop', e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
              Offset Gauche (mm)
            </label>
            <input
              type="number"
              step="0.1"
              value={customLayout.offsetLeft}
              onChange={(e) => handleCustomLayoutChange('offsetLeft', e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700"
            />
          </div>

          {/* Espacement Vertical et Horizontal */}
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
              Espacement Vertical (mm)
            </label>
            <input
              type="number"
              step="0.1"
              value={customLayout.spacingV}
              onChange={(e) => handleCustomLayoutChange('spacingV', e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
              Espacement Horizontal (mm)
            </label>
            <input
              type="number"
              step="0.1"
              value={customLayout.spacingH}
              onChange={(e) => handleCustomLayoutChange('spacingH', e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700"
            />
          </div>
        </div>
      </div>

      {/* ✅ STYLE DES ÉTIQUETTES */}
      <div className="bg-white dark:bg-gray-800 rounded-md p-3 border border-gray-200 dark:border-gray-600">
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center">
          <Palette className="h-4 w-4 mr-2" />
          Style des étiquettes
        </h4>

        <div className="space-y-3">
          {/* Éléments à afficher */}
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={labelStyle.showName}
                onChange={(e) => handleStyleChange({ showName: e.target.checked })}
                className="mr-2 text-blue-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Nom produit</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={labelStyle.showPrice}
                onChange={(e) => handleStyleChange({ showPrice: e.target.checked })}
                className="mr-2 text-blue-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Prix</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={labelStyle.showBarcode}
                onChange={(e) => handleStyleChange({ showBarcode: e.target.checked })}
                className="mr-2 text-blue-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Code-barres</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={labelStyle.showBorder}
                onChange={(e) => handleStyleChange({ showBorder: e.target.checked })}
                className="mr-2 text-blue-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Bordure</span>
            </label>
          </div>

          {/* Tailles de police */}
          <div className="grid grid-cols-3 gap-3">
            {labelStyle.showName && (
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                  Taille nom
                </label>
                <input
                  type="number"
                  min="6"
                  max="20"
                  value={labelStyle.nameSize}
                  onChange={(e) => handleStyleChange({ nameSize: parseInt(e.target.value) })}
                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700"
                />
              </div>
            )}
            {labelStyle.showPrice && (
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                  Taille prix
                </label>
                <input
                  type="number"
                  min="8"
                  max="24"
                  value={labelStyle.priceSize}
                  onChange={(e) => handleStyleChange({ priceSize: parseInt(e.target.value) })}
                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700"
                />
              </div>
            )}
            {labelStyle.showBarcode && (
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                  Hauteur code-barres
                </label>
                <input
                  type="number"
                  min="10"
                  max="30"
                  value={labelStyle.barcodeHeight}
                  onChange={(e) => handleStyleChange({ barcodeHeight: parseInt(e.target.value) })}
                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ✅ APERÇU TAILLE RÉELLE */}
      {labelData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-md p-3 border border-gray-200 dark:border-gray-600">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center">
            <Eye className="h-4 w-4 mr-2" />
            Aperçu étiquette (taille réelle)
          </h4>

          <div className="flex justify-center">{renderLabelPreview()}</div>

          <div className="mt-3 text-xs text-gray-500 text-center">
            Cet aperçu montre la taille réelle de l'étiquette sur votre écran
          </div>
        </div>
      )}
    </div>
  );
};

export default LabelsLayoutConfigurator;
