import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import BarcodeSelector from '../../../../components/common/BarcodeSelector';

const BarcodeSection = ({ product, editable, register, control, errors, setValue, watch }) => {
  // Extraction du code-barres des métadonnées
  const getBarcodeValue = () => {
    if (!product?.meta_data) return '';
    const barcodeData = product.meta_data.find((item) => item.key === 'barcode');
    return barcodeData ? barcodeData.value : '';
  };

  const barcodeValue = getBarcodeValue();
  const [localBarcode, setLocalBarcode] = useState(barcodeValue || '');
  const [showBarcodes, setShowBarcodes] = useState(false);

  // Fonction pour mettre à jour les meta_data
  const updateBarcodeInMetaData = (newValue) => {
    const currentMetaData = watch('meta_data') || [];

    // Trouver l'index du barcode existant
    const barcodeIndex = currentMetaData.findIndex((item) => item.key === 'barcode');

    if (barcodeIndex >= 0) {
      // Mettre à jour l'existant
      if (newValue && newValue.trim()) {
        currentMetaData[barcodeIndex].value = newValue.trim();
      } else {
        // Supprimer si vide
        currentMetaData.splice(barcodeIndex, 1);
      }
    } else if (newValue && newValue.trim()) {
      // Ajouter nouveau
      currentMetaData.push({
        key: 'barcode',
        value: newValue.trim(),
      });
    }

    // Mettre à jour le formulaire
    setValue('meta_data', currentMetaData, { shouldDirty: true, shouldTouch: true });
  };

  // Mise à jour du state local quand les props changent
  useEffect(() => {
    setLocalBarcode(barcodeValue || '');
  }, [barcodeValue]);

  // Handler pour les changements de code-barres
  const handleBarcodeChange = (e) => {
    const newValue = e.target.value;
    console.log('🔧 Changement code-barres:', newValue);
    setLocalBarcode(newValue);
    updateBarcodeInMetaData(newValue);

    // Debug: vérifier les meta_data après mise à jour
    setTimeout(() => {
      const currentMetaData = watch('meta_data');
      console.log('📊 Meta_data après changement:', currentMetaData);
    }, 100);
  };

  if (!editable) {
    return (
      <div>
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          Codes d'identification
        </h2>

        <div className="mb-4">
          <div className="flex items-center">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Code-barres</h3>
            <span className="ml-2 text-gray-900 dark:text-gray-100">
              {barcodeValue || 'Non défini'}
            </span>
            {barcodeValue && (
              <button
                onClick={() => setShowBarcodes(!showBarcodes)}
                className="ml-3 text-xs bg-gray-50 text-blue-500 hover:text-blue-700 px-2 py-1 rounded"
              >
                {showBarcodes ? 'Masquer' : 'Afficher'}
              </button>
            )}
          </div>

          {barcodeValue && showBarcodes && (
            <div className="mt-4 flex flex-col md:flex-row md:space-x-8">
              <div className="border p-4 rounded-lg bg-white flex flex-col items-center mb-4 md:mb-0">
                <div className="text-sm text-gray-500 mb-2">Format: EAN13</div>
                <BarcodeSelector
                  value={barcodeValue}
                  readOnly={true}
                  showBoth={false}
                  hideImprint={true}
                />
              </div>

              <div className="border p-4 rounded-lg bg-white flex flex-col items-center">
                <div className="text-sm text-gray-500 mb-2">QR Code</div>
                <QRCodeSVG value={barcodeValue} size={128} level="M" />
                <div className="flex space-x-2 mt-3">
                  <a
                    href={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(
                      `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
                      <foreignObject width="128" height="128">
                        <div xmlns="http://www.w3.org/1999/xhtml">
                          ${document.querySelector('svg')?.outerHTML || ''}
                        </div>
                      </foreignObject>
                    </svg>`
                    )}`}
                    download={`qrcode-${barcodeValue}.svg`}
                    className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                  >
                    SVG
                  </a>
                  <button
                    className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                    onClick={() => {
                      // Créer un PNG à partir du SVG
                      const svg = document.querySelector('svg');
                      if (svg) {
                        const svgData = new XMLSerializer().serializeToString(svg);
                        const canvas = document.createElement('canvas');
                        canvas.width = 128;
                        canvas.height = 128;
                        const ctx = canvas.getContext('2d');
                        const img = new Image();
                        img.onload = () => {
                          ctx.drawImage(img, 0, 0);
                          const pngUrl = canvas.toDataURL('image/png');
                          const downloadLink = document.createElement('a');
                          downloadLink.href = pngUrl;
                          downloadLink.download = `qrcode-${barcodeValue}.png`;
                          downloadLink.click();
                        };
                        img.src =
                          'data:image/svg+xml;base64,' +
                          btoa(unescape(encodeURIComponent(svgData)));
                      }
                    }}
                  >
                    PNG
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
        Codes d'identification
      </h2>

      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Code-barres
            </label>
            <input
              type="text"
              value={localBarcode}
              onChange={handleBarcodeChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Ex: 3760010255333"
            />
            {errors?.meta_data?.barcode && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-500">
                {errors.meta_data.barcode.message}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Entrez le code-barres (EAN-13 recommandé)
            </p>
          </div>
        </div>

        {/* Prévisualisation en temps réel */}
        {localBarcode && localBarcode.length > 0 && (
          <div className="mt-4 p-4 border rounded-lg bg-gray-50">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-medium text-gray-700">Prévisualisation</h3>
              <button
                type="button"
                onClick={() => setShowBarcodes(!showBarcodes)}
                className="text-xs bg-white border border-gray-300 px-2 py-1 rounded text-gray-600 hover:bg-gray-50"
              >
                {showBarcodes ? 'Masquer' : 'Afficher'}
              </button>
            </div>

            {showBarcodes ? (
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-6">
                <div className="bg-white p-3 border border-gray-200 rounded">
                  <h4 className="text-xs font-medium text-gray-500 mb-2">Code-barres EAN-13</h4>
                  <BarcodeSelector value={localBarcode} readOnly={true} showBoth={false} />
                </div>

                <div className="bg-white p-3 border border-gray-200 rounded">
                  <h4 className="text-xs font-medium text-gray-500 mb-2">QR Code</h4>
                  <QRCodeSVG value={localBarcode} size={128} level="M" />
                  <div className="flex space-x-2 mt-3">
                    <button
                      type="button"
                      className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                      onClick={() => {
                        // Export SVG
                        const svg = document.querySelector('.bg-white.p-3 svg');
                        if (svg) {
                          const svgData = new XMLSerializer().serializeToString(svg);
                          const svgBlob = new Blob([svgData], {
                            type: 'image/svg+xml;charset=utf-8',
                          });
                          const svgUrl = URL.createObjectURL(svgBlob);
                          const link = document.createElement('a');
                          link.href = svgUrl;
                          link.download = `qrcode-${localBarcode}.svg`;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          URL.revokeObjectURL(svgUrl);
                        }
                      }}
                    >
                      SVG
                    </button>
                    <button
                      type="button"
                      className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                      onClick={() => {
                        // Export PNG
                        const svg = document.querySelector('.bg-white.p-3 svg');
                        if (svg) {
                          const svgData = new XMLSerializer().serializeToString(svg);
                          const canvas = document.createElement('canvas');
                          canvas.width = 128;
                          canvas.height = 128;
                          const ctx = canvas.getContext('2d');
                          const img = new Image();
                          img.onload = () => {
                            ctx.drawImage(img, 0, 0);
                            const pngUrl = canvas.toDataURL('image/png');
                            const link = document.createElement('a');
                            link.href = pngUrl;
                            link.download = `qrcode-${localBarcode}.png`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          };
                          img.src =
                            'data:image/svg+xml;base64,' +
                            btoa(unescape(encodeURIComponent(svgData)));
                        }
                      }}
                    >
                      PNG
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Valeur: {localBarcode}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BarcodeSection;
