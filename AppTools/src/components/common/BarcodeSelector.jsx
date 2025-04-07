import React, { useState } from 'react';
import BarcodeDisplay from './BarcodeDisplay';
import QRCodeDisplay from './QRCodeDisplay';

const BarcodeSelector = ({
  value,
  onChange,
  readOnly = false,
  showBoth = false,
  hideImprint = false,
}) => {
  const [activeTab, setActiveTab] = useState(showBoth ? 'both' : 'barcode');
  const [barcodeType, setBarcodeType] = useState('EAN13');
  const [qrErrorCorrectionLevel, setQrErrorCorrectionLevel] = useState('M');

  // Types de codes-barres supportés par JsBarcode
  const barcodeTypes = [
    { id: 'EAN13', label: 'EAN-13', description: 'Standard pour les produits commerciaux' },
    { id: 'EAN8', label: 'EAN-8', description: 'Version courte du EAN-13' },
    { id: 'UPC', label: 'UPC-A', description: 'Universal Product Code' },
    { id: 'CODE128', label: 'CODE 128', description: 'Caractères alphanumériques' },
    { id: 'CODE39', label: 'CODE 39', description: 'Industrie et logistique' },
    { id: 'ITF14', label: 'ITF-14', description: 'Transport et logistique' },
    { id: 'MSI', label: 'MSI', description: 'Gestion de stocks' },
    { id: 'pharmacode', label: 'Pharmacode', description: 'Industrie pharmaceutique' },
  ];

  // Niveaux de correction d'erreur pour QR Code
  const errorCorrectionLevels = [
    { id: 'L', label: 'Faible (7%)', description: 'Données plus denses, moins robuste' },
    { id: 'M', label: 'Moyen (15%)', description: 'Équilibre entre densité et fiabilité' },
    { id: 'Q', label: 'Qualité (25%)', description: 'Plus robuste, moins dense' },
    { id: 'H', label: 'Élevé (30%)', description: 'Maximum de protection, moins dense' },
  ];

  // Validation de code-barres simple (peut être améliorée selon le type)
  const isValidBarcode = (code, type) => {
    if (!code) return false;

    switch (type) {
      case 'EAN13':
        return /^\d{13}$/.test(code);
      case 'EAN8':
        return /^\d{8}$/.test(code);
      case 'UPC':
        return /^\d{12}$/.test(code);
      case 'CODE128':
      case 'CODE39':
        return code.length > 0;
      case 'ITF14':
        return /^\d{14}$/.test(code);
      case 'MSI':
        return /^\d+$/.test(code);
      case 'pharmacode':
        return /^\d+$/.test(code) && parseInt(code) > 0;
      default:
        return true;
    }
  };

  if (readOnly) {
    return (
      <div className="space-y-4">
        {(activeTab === 'barcode' || activeTab === 'both') && (
          <div className="p-4 border rounded-md bg-white">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Code-barres ({barcodeType})</h3>
            <BarcodeDisplay
              value={value}
              type={barcodeType}
              displayValue={true}
              hideImprint={hideImprint}
            />
          </div>
        )}

        {(activeTab === 'qrcode' || activeTab === 'both') && (
          <div className="p-4 border rounded-md bg-white">
            <h3 className="text-sm font-medium text-gray-700 mb-3">QR Code</h3>
            <QRCodeDisplay value={value} level={qrErrorCorrectionLevel} hideImprint={hideImprint} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Entrée du code */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
        <div className="flex">
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Entrez un code (ex: 1234567890128)"
          />
        </div>
        {/* Validation */}
        {value && !isValidBarcode(value, barcodeType) && (
          <p className="mt-1 text-sm text-red-600">
            Ce code n'est pas valide pour le format {barcodeType}
          </p>
        )}
      </div>

      {/* Sélection du type d'affichage */}
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px">
          <button
            onClick={() => setActiveTab('barcode')}
            className={`${
              activeTab === 'barcode'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-2 px-4 border-b-2 font-medium text-sm`}
          >
            Code-barres
          </button>
          <button
            onClick={() => setActiveTab('qrcode')}
            className={`${
              activeTab === 'qrcode'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-2 px-4 border-b-2 font-medium text-sm`}
          >
            QR Code
          </button>
          <button
            onClick={() => setActiveTab('both')}
            className={`${
              activeTab === 'both'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-2 px-4 border-b-2 font-medium text-sm`}
          >
            Les deux
          </button>
        </nav>
      </div>

      {/* Options et prévisualisation */}
      <div className="space-y-4">
        {/* Options de codes-barres */}
        {(activeTab === 'barcode' || activeTab === 'both') && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type de code-barres
              </label>
              <select
                value={barcodeType}
                onChange={(e) => setBarcodeType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                {barcodeTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.label} - {type.description}
                  </option>
                ))}
              </select>
            </div>
            <div className="p-4 border rounded-md bg-white">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Prévisualisation</h3>
              {value && (
                <BarcodeDisplay
                  value={value}
                  type={barcodeType}
                  displayValue={true}
                  hideImprint={hideImprint}
                />
              )}
              {!value && (
                <div className="text-center text-gray-400">
                  Entrez un code pour générer un code-barres
                </div>
              )}
            </div>
          </div>
        )}

        {/* Options QR Code */}
        {(activeTab === 'qrcode' || activeTab === 'both') && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Niveau de correction d'erreur
              </label>
              <select
                value={qrErrorCorrectionLevel}
                onChange={(e) => setQrErrorCorrectionLevel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                {errorCorrectionLevels.map((level) => (
                  <option key={level.id} value={level.id}>
                    {level.label} - {level.description}
                  </option>
                ))}
              </select>
            </div>
            <div className="p-4 border rounded-md bg-white">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Prévisualisation</h3>
              {value && (
                <QRCodeDisplay
                  value={value}
                  level={qrErrorCorrectionLevel}
                  size={150}
                  hideImprint={hideImprint}
                />
              )}
              {!value && (
                <div className="text-center text-gray-400">
                  Entrez un code pour générer un QR code
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BarcodeSelector;
