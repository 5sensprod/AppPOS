// src/components/common/fields/BarcodeField.jsx
import React, { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { QrCode, Barcode, Download, Eye, EyeOff } from 'lucide-react';
import { sharedClasses } from '../../atoms/Select/selectStyles';

const BarcodeField = ({
  name = 'barcode',
  label = 'Code-barres',
  value,
  editable = false,
  onGenerate,
  isGenerating = false,
  className = '',
  showPreview = true,
}) => {
  const formContext = useFormContext();
  const register = formContext?.register;
  const errors = formContext?.formState?.errors;

  const [showCodes, setShowCodes] = useState(false);
  const error = errors?.[name];

  if (!editable) {
    // Mode lecture avec style cohérent
    return (
      <div className={className}>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          <QrCode className="inline h-4 w-4 mr-1" />
          {label}
        </label>

        {value ? (
          <div className="space-y-3">
            {/* Chip avec la valeur */}
            <div className="inline-flex items-center px-3 py-2 rounded-lg border bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-700">
              <Barcode className="h-3 w-3 mr-1" />
              <span className="font-medium">{value}</span>
              {showPreview && (
                <button
                  onClick={() => setShowCodes(!showCodes)}
                  className="ml-2 p-1 rounded-full hover:bg-blue-100 dark:hover:bg-blue-800/30 transition-colors"
                  title={showCodes ? 'Masquer les codes' : 'Afficher les codes'}
                >
                  {showCodes ? <EyeOff size={12} /> : <Eye size={12} />}
                </button>
              )}
            </div>

            {/* Prévisualisation des codes */}
            {showCodes && showPreview && <BarcodePreview value={value} />}
          </div>
        ) : (
          <div className="px-4 py-3 border-2 border-dashed rounded-lg border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-800">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Aucun code-barres défini
            </span>
          </div>
        )}
      </div>
    );
  }

  // Mode édition
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        <QrCode className="inline h-4 w-4 mr-1" />
        {label}
      </label>

      <div className="flex space-x-2">
        <input
          type="text"
          {...register(name)}
          placeholder="Ex: 2001234567890"
          maxLength="13"
          className={`flex-1 ${sharedClasses.input} ${error ? sharedClasses.error : ''}`}
        />

        {onGenerate && (
          <button
            type="button"
            onClick={onGenerate}
            disabled={isGenerating}
            className="flex items-center justify-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Générer un code EAN-13 automatiquement"
          >
            {isGenerating ? (
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
            ) : (
              <Barcode className="h-4 w-4" />
            )}
            <span className="ml-1 text-sm">Générer</span>
          </button>
        )}
      </div>

      {error && <p className="mt-1 text-sm text-red-600 dark:text-red-500">{error.message}</p>}
    </div>
  );
};

// ===== COMPOSANT DE PRÉVISUALISATION =====

const BarcodePreview = ({ value }) => {
  const [activeView, setActiveView] = useState('barcode');

  if (!value) return null;

  return (
    <div className="border rounded-lg bg-gray-50 dark:bg-gray-800 p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Prévisualisation</h4>
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveView('barcode')}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              activeView === 'barcode'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            Code-barres
          </button>
          <button
            onClick={() => setActiveView('qrcode')}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              activeView === 'qrcode'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            QR Code
          </button>
          <button
            onClick={() => setActiveView('both')}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              activeView === 'both'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            Les deux
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(activeView === 'barcode' || activeView === 'both') && (
          <BarcodeDisplayCard value={value} type="barcode" />
        )}

        {(activeView === 'qrcode' || activeView === 'both') && (
          <BarcodeDisplayCard value={value} type="qrcode" />
        )}
      </div>
    </div>
  );
};

// ===== COMPOSANT CARTE D'AFFICHAGE =====

const BarcodeDisplayCard = ({ value, type }) => {
  const isQR = type === 'qrcode';

  return (
    <div className="bg-white dark:bg-gray-700 p-3 border border-gray-200 dark:border-gray-600 rounded">
      <div className="flex items-center justify-between mb-2">
        <h5 className="text-xs font-medium text-gray-500 dark:text-gray-400">
          {isQR ? 'QR Code' : 'Code-barres EAN-13'}
        </h5>
        <div className="flex space-x-1">
          <button
            onClick={() => downloadCode(value, type, 'svg')}
            className="p-1 text-xs text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
            title="Télécharger SVG"
          >
            <Download size={12} />
          </button>
          <button
            onClick={() => downloadCode(value, type, 'png')}
            className="p-1 text-xs text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
            title="Télécharger PNG"
          >
            <Download size={12} />
          </button>
        </div>
      </div>

      <div className="flex justify-center">
        {isQR ? <QRCodeDisplay value={value} size={100} /> : <BarcodeDisplay value={value} />}
      </div>
    </div>
  );
};

// ===== FONCTIONS UTILITAIRES =====

const downloadCode = (value, type, format) => {
  // Logique de téléchargement à implémenter selon vos besoins
  console.log(`Télécharger ${type} (${format}):`, value);
};

// Composants de rendu simples (à remplacer par vos composants existants)
const QRCodeDisplay = ({ value, size = 100 }) => (
  <div className="w-24 h-24 bg-gray-200 dark:bg-gray-600 rounded flex items-center justify-center">
    <QrCode className="h-8 w-8 text-gray-400" />
  </div>
);

const BarcodeDisplay = ({ value }) => (
  <div className="w-32 h-16 bg-gray-200 dark:bg-gray-600 rounded flex items-center justify-center">
    <Barcode className="h-6 w-6 text-gray-400" />
  </div>
);

export default BarcodeField;
