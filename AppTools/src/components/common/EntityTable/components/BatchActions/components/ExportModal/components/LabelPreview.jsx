// 📁 components/LabelPreview.jsx
import React from 'react';
import { Eye } from 'lucide-react';

const LabelPreview = ({ labelData, customLayout, labelStyle }) => {
  if (labelData.length === 0) return null;

  const sampleLabel = labelData[0];
  const mmToPx = 3.779527559;
  const previewWidth = customLayout.width * mmToPx;
  const previewHeight = customLayout.height * mmToPx;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-md p-3 border border-gray-200 dark:border-gray-600">
      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center">
        <Eye className="h-4 w-4 mr-2" />
        Aperçu étiquette (taille réelle)
      </h4>

      <div className="flex justify-center">
        <div className="bg-white border border-gray-300 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            Aperçu taille réelle ({customLayout.width}×{customLayout.height}mm)
          </h4>
          <div
            className="relative bg-white flex flex-col items-center justify-start text-center"
            style={{
              width: `${previewWidth}px`,
              height: `${previewHeight}px`,
              border: labelStyle.showBorder
                ? `${labelStyle.borderWidth}px solid ${labelStyle.borderColor}`
                : '1px solid #ccc',
              fontSize: `${labelStyle.nameSize}px`,
              padding: '2px',
            }}
          >
            {/* Nom du produit */}
            {labelStyle.showName && (
              <div
                className="font-bold text-gray-900 leading-tight mt-1"
                style={{
                  fontSize: `${Math.max(8, labelStyle.nameSize * 0.8)}px`,
                  maxWidth: '100%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {sampleLabel.name}
              </div>
            )}

            {/* Prix */}
            {labelStyle.showPrice && (
              <div
                className="font-bold text-gray-900 flex-shrink-0"
                style={{
                  fontSize: `${Math.max(10, labelStyle.priceSize * 0.8)}px`,
                  marginTop: labelStyle.showName ? '3px' : '8px',
                }}
              >
                {sampleLabel.price.toFixed(2)} €
              </div>
            )}

            {/* Code-barres */}
            {labelStyle.showBarcode && sampleLabel.barcode && (
              <div className="mt-1">
                <div
                  className="bg-gray-900 flex"
                  style={{
                    height: `${labelStyle.barcodeHeight}px`,
                    width: '80%',
                  }}
                >
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
      </div>

      <div className="mt-3 text-xs text-gray-500 text-center">
        Cet aperçu montre la taille réelle de l'étiquette sur votre écran
      </div>
    </div>
  );
};

export default LabelPreview;
