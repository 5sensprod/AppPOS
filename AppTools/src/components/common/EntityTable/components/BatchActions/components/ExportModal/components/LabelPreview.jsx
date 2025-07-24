// 📁 components/LabelPreview.jsx
import React, { useEffect, useRef } from 'react';
import { Eye, Ruler } from 'lucide-react';

// Composant pour générer le vrai code-barres IDENTIQUE au PDF
const BarcodeCanvas = ({ value, height, width }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const generateBarcode = async () => {
      try {
        // Import dynamique de JsBarcode (même que exportService.js)
        const JsBarcode = (await import('jsbarcode')).default;
        const canvas = canvasRef.current;

        if (canvas && value && value.trim() !== '') {
          // ✅ PARAMÈTRES IDENTIQUES À exportService.js
          const userBarcodeHeight = (height || 15) * 0.25; // Même calcul
          const targetBarcodeWidth = Math.min(width - 1, 35); // Même calcul

          // Dimensions canvas identiques
          canvas.width = targetBarcodeWidth * 10;
          canvas.height = userBarcodeHeight * 8;

          // Configuration EXACTEMENT identique au PDF
          JsBarcode(canvas, value, {
            format: 'EAN13',
            width: 2,
            height: userBarcodeHeight * 6, // ✅ Même formule que le PDF
            displayValue: false,
            background: '#ffffff',
            lineColor: '#000000',
            margin: 2,
          });
        }
      } catch (error) {
        console.warn('Erreur génération code-barres aperçu:', error);
        // En cas d'erreur, afficher les barres de simulation
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#000';
          // Simulation simple en cas d'échec
          for (let i = 0; i < width; i += 3) {
            if (i % 6 < 3) {
              ctx.fillRect(i, 0, 2, height * 0.8);
            }
          }
        }
      }
    };

    generateBarcode();
  }, [value, height, width]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        imageRendering: 'pixelated', // Pour des barres nettes
      }}
    />
  );
};

const LabelPreview = ({ labelData, customLayout, labelStyle }) => {
  if (labelData.length === 0) return null;

  const sampleLabel = labelData[0];
  const mmToPx = 3.779527559; // Conversion exacte mm vers px (96 DPI)

  // Dimensions exactes pour l'aperçu (taille réelle)
  const previewWidth = customLayout.width * mmToPx;
  const previewHeight = customLayout.height * mmToPx;

  // Calcul des dimensions de grille pour informations
  const pageWidth = 210; // A4 en mm
  const pageHeight = 297;
  const usableWidth = pageWidth - customLayout.offsetLeft * 2;
  const usableHeight = pageHeight - customLayout.offsetTop * 2;
  const columns = Math.floor(usableWidth / (customLayout.width + customLayout.spacingH));
  const rows = Math.floor(usableHeight / (customLayout.height + customLayout.spacingV));
  const labelsPerPage = columns * rows;

  // ✅ Styles exacts avec gestion des marges identique au PDF
  const contentPadding = labelStyle.padding || 1; // Padding en mm, converti en px
  const labelStyles = {
    width: `${previewWidth}px`,
    height: `${previewHeight}px`,
    border: labelStyle.showBorder
      ? `${labelStyle.borderWidth}px solid ${labelStyle.borderColor}`
      : '1px solid #e5e5e5',
    padding: `${contentPadding * mmToPx}px`, // ✅ Conversion mm vers px pour padding
    fontFamily: labelStyle.fontFamily || 'Arial, sans-serif',
    backgroundColor: '#fff',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-around', // ✅ Légèrement plus d'espacement qu'avec space-evenly
    position: 'relative',
    boxSizing: 'border-box',
  };

  const renderLabelContent = () => {
    const elements = [];

    // ✅ ORDRE IDENTIQUE AU PDF : NOM → PRIX → CODE-BARRES

    // 1. NOM DU PRODUIT EN PREMIER (comme dans drawLabelOnPDF)
    if (labelStyle.showName) {
      elements.push(
        <div
          key="name"
          style={{
            fontSize: `${labelStyle.nameSize}px`,
            color: '#000',
            textAlign: 'center',
            maxWidth: '100%',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            lineHeight: 1.1,
            margin: 0,
            fontWeight: 'bold', // ✅ Comme dans le PDF
          }}
        >
          {sampleLabel.name}
        </div>
      );
    }

    // 2. PRIX EN DEUXIÈME (élément principal)
    if (labelStyle.showPrice) {
      elements.push(
        <div
          key="price"
          style={{
            fontSize: `${labelStyle.priceSize}px`,
            fontWeight: 'bold',
            color: '#000',
            textAlign: 'center',
            lineHeight: 1,
            margin: 0,
          }}
        >
          {sampleLabel.price.toFixed(2)} €
        </div>
      );
    }

    // 3. CODE-BARRES EN DERNIER (en bas, comme dans le PDF)
    if (labelStyle.showBarcode && sampleLabel.barcode) {
      elements.push(
        <div
          key="barcode"
          style={{
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            margin: 0,
          }}
        >
          {/* ✅ Code-barres avec taille proportionnelle */}
          <BarcodeCanvas
            value={sampleLabel.barcode}
            height={labelStyle.barcodeHeight}
            width={Math.min(previewWidth * 0.85, previewWidth - contentPadding * mmToPx * 2)}
          />

          {/* Numéro sous le code-barres - Format identique au PDF */}
          <div
            style={{
              fontSize: '8px',
              color: '#000',
              fontFamily: 'monospace',
              letterSpacing: '1px',
              marginTop: '2px',
              fontWeight: 'normal',
            }}
          >
            {/* ✅ Format identique à votre fonction formatEAN13Text dans exportService.js */}
            {(() => {
              const cleanBarcode = sampleLabel.barcode.replace(/[\s-]/g, '');
              if (cleanBarcode.length === 13 && /^\d+$/.test(cleanBarcode)) {
                return `${cleanBarcode[0]} ${cleanBarcode.slice(1, 7)} ${cleanBarcode.slice(7)}`;
              }
              if (cleanBarcode.length === 8 && /^\d+$/.test(cleanBarcode)) {
                return `${cleanBarcode.slice(0, 4)} ${cleanBarcode.slice(4)}`;
              }
              if (cleanBarcode.length === 12 && /^\d+$/.test(cleanBarcode)) {
                const ean13 = '0' + cleanBarcode;
                return `${ean13[0]} ${ean13.slice(1, 7)} ${ean13.slice(7)}`;
              }
              return cleanBarcode;
            })()}
          </div>
        </div>
      );
    }

    return elements;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-md p-4 border border-gray-200 dark:border-gray-600">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center">
          <Eye className="h-4 w-4 mr-2" />
          Aperçu étiquette - Taille réelle
        </h4>
        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
          <Ruler className="h-3 w-3 mr-1" />
          {customLayout.width} × {customLayout.height} mm
        </div>
      </div>

      {/* Informations de contexte détaillées */}
      <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-xs">
        <div className="grid grid-cols-2 gap-3 text-gray-600 dark:text-gray-400">
          <div className="space-y-1">
            <div className="flex items-center">
              📄{' '}
              <span className="ml-1">
                Grille: {columns} × {rows}
              </span>
            </div>
            <div className="flex items-center">
              🏷️ <span className="ml-1">Par page: {labelsPerPage}</span>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center">
              📊 <span className="ml-1">Total étiquettes: {labelData.length}</span>
            </div>
            <div className="flex items-center">
              📑{' '}
              <span className="ml-1">
                Pages nécessaires: {Math.ceil(labelData.length / labelsPerPage)}
              </span>
            </div>
          </div>
        </div>

        {/* Contexte de l'étiquette exemple */}
        <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-600">
          <div className="text-gray-700 dark:text-gray-300 font-medium mb-1">
            Étiquette exemple: "{sampleLabel.name}"
          </div>
          <div className="grid grid-cols-3 gap-2 text-gray-600 dark:text-gray-400">
            <div>💰 Prix: {sampleLabel.price.toFixed(2)} €</div>
            <div>📱 Code: {sampleLabel.barcode || 'Aucun'}</div>
            <div>🏷️ SKU: {sampleLabel.sku || 'N/A'}</div>
          </div>
        </div>
      </div>

      {/* Aperçu de l'étiquette */}
      <div className="flex justify-center">
        <div className="bg-gray-100 p-4 rounded-lg shadow-sm">
          <div style={labelStyles}>{renderLabelContent()}</div>

          {/* Légende */}
          <div className="mt-3 text-center">
            <div className="text-xs text-gray-600 font-medium">
              Aperçu 1:1 (taille exacte sur votre écran)
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Cette vue correspond exactement au PDF généré
            </div>
          </div>
        </div>
      </div>

      {/* Configuration active avec plus de détails */}
      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
        <h5 className="text-xs font-semibold text-blue-800 dark:text-blue-200 mb-2 flex items-center">
          <Eye className="h-3 w-3 mr-1" />
          Configuration active:
        </h5>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="space-y-1">
            {labelStyle.showPrice && (
              <div className="text-blue-700 dark:text-blue-300">
                ✓ Prix: {labelStyle.priceSize}px, gras
              </div>
            )}
            {labelStyle.showName && (
              <div className="text-blue-700 dark:text-blue-300">✓ Nom: {labelStyle.nameSize}px</div>
            )}
          </div>
          <div className="space-y-1">
            {labelStyle.showBarcode && (
              <div className="text-blue-700 dark:text-blue-300">
                ✓ Code-barres: {labelStyle.barcodeHeight}px (JsBarcode)
              </div>
            )}
            {labelStyle.showBorder && (
              <div className="text-blue-700 dark:text-blue-300">
                ✓ Bordure: {labelStyle.borderWidth}px
              </div>
            )}
          </div>
        </div>

        {/* Dimensions et espacement */}
        <div className="mt-2 pt-2 border-t border-blue-200 dark:border-blue-700">
          <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">
            Dimensions:
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs text-blue-700 dark:text-blue-300">
            <div>
              📐 {customLayout.width} × {customLayout.height} mm
            </div>
            <div>
              📏 Offset: {customLayout.offsetTop}/{customLayout.offsetLeft} mm
            </div>
            <div>
              ↔️ Espacement: {customLayout.spacingH}/{customLayout.spacingV} mm
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabelPreview;
