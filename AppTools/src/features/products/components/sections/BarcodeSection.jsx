// src/features/products/components/sections/BarcodeSection.jsx
import React, { useState, useEffect } from 'react';
import { QrCode, Barcode, Eye, EyeOff, Download, AlertCircle, CheckCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import BarcodeSelector from '../../../../components/common/BarcodeSelector';
import { BarcodeInput } from '../../../../components/atoms/Input';
import { generateEAN13, validateEAN13, formatEAN13 } from '../../../../utils/barcodeGenerator';
import { useFormContext } from 'react-hook-form';

// ===== COMPOSANTS UI =====

const BarcodeValueChip = ({ value, isValid = true, onTogglePreview, showPreview = false }) => {
  if (!value) return null;

  return (
    <div
      className={`inline-flex items-center px-3 py-2 rounded-lg border ${
        isValid
          ? 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-700'
          : 'bg-red-50 text-red-800 border-red-300 border-2 dark:bg-red-900/30 dark:text-red-200 dark:border-red-700'
      }`}
    >
      <Barcode className="h-3 w-3 mr-1" />
      <span className="font-medium">{value}</span>
      {isValid ? (
        <CheckCircle className="h-3 w-3 ml-1 text-green-500" />
      ) : (
        <AlertCircle className="h-3 w-3 ml-1 text-red-500" />
      )}
      <button
        onClick={onTogglePreview}
        className="ml-2 p-1 rounded-full hover:bg-blue-100 dark:hover:bg-blue-800/30 transition-colors"
        title={showPreview ? 'Masquer les codes' : 'Afficher les codes'}
      >
        {showPreview ? <EyeOff size={12} /> : <Eye size={12} />}
      </button>
    </div>
  );
};

const BarcodePreviewCard = ({ value, type = 'both', title }) => {
  const [activeView, setActiveView] = useState(type === 'both' ? 'barcode' : type);

  return (
    <div className="bg-white dark:bg-gray-700 p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {title || 'Prévisualisation'}
        </h4>

        {type === 'both' && (
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveView('barcode')}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                activeView === 'barcode'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300'
              }`}
            >
              Code-barres
            </button>
            <button
              onClick={() => setActiveView('qrcode')}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                activeView === 'qrcode'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300'
              }`}
            >
              QR Code
            </button>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {(activeView === 'barcode' || type === 'barcode') && (
          <BarcodeDisplayContainer value={value} type="barcode" />
        )}

        {(activeView === 'qrcode' || type === 'qrcode') && (
          <BarcodeDisplayContainer value={value} type="qrcode" />
        )}
      </div>
    </div>
  );
};

const BarcodeDisplayContainer = ({ value, type }) => {
  const isQR = type === 'qrcode';

  const downloadCode = (format) => {
    // Utiliser vos fonctions de téléchargement existantes
    console.log(`Télécharger ${type} (${format}):`, value);
  };

  return (
    <div className="flex flex-col items-center space-y-3">
      <div className="bg-white p-3 border border-gray-200 rounded">
        {isQR ? (
          <QRCodeSVG value={value} size={128} level="M" />
        ) : (
          <BarcodeSelector value={value} readOnly={true} showBoth={false} hideImprint={true} />
        )}
      </div>

      <div className="flex space-x-2">
        <button
          onClick={() => downloadCode('svg')}
          className="flex items-center px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
        >
          <Download size={12} className="mr-1" />
          SVG
        </button>
        <button
          onClick={() => downloadCode('png')}
          className="flex items-center px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
        >
          <Download size={12} className="mr-1" />
          PNG
        </button>
      </div>
    </div>
  );
};

// ===== MODE LECTURE =====

const ReadOnlyView = ({ product }) => {
  const [showBarcodes, setShowBarcodes] = useState(false);

  // Extraction du code-barres des métadonnées
  const getBarcodeValue = () => {
    if (!product?.meta_data) return '';
    const barcodeData = product.meta_data.find((item) => item.key === 'barcode');
    return barcodeData ? barcodeData.value : '';
  };

  const barcodeValue = getBarcodeValue();
  const isValidBarcode = barcodeValue ? validateEAN13(barcodeValue) : true;

  return (
    <div>
      <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-6">
        <div className="flex items-center">
          <QrCode className="h-5 w-5 mr-2" />
          <span>Codes d'identification</span>
        </div>
      </h2>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          <Barcode className="inline h-4 w-4 mr-1" />
          Code-barres EAN-13
        </label>

        {barcodeValue ? (
          <div className="space-y-4">
            <BarcodeValueChip
              value={barcodeValue}
              isValid={isValidBarcode}
              onTogglePreview={() => setShowBarcodes(!showBarcodes)}
              showPreview={showBarcodes}
            />

            {!isValidBarcode && (
              <div className="text-sm text-red-600 dark:text-red-500">
                ⚠️ Ce code EAN-13 n'est pas valide (problème de clé de contrôle)
              </div>
            )}

            {showBarcodes && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <BarcodePreviewCard
                  value={barcodeValue}
                  type="barcode"
                  title="Code-barres EAN-13"
                />
                <BarcodePreviewCard value={barcodeValue} type="qrcode" title="QR Code" />
              </div>
            )}
          </div>
        ) : (
          <div className="px-4 py-3 border-2 border-dashed rounded-lg border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-800">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Aucun code-barres défini
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

// ===== MODE ÉDITION =====

const EditableView = ({ product }) => {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext();

  const [localBarcode, setLocalBarcode] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Extraction du code-barres des métadonnées
  const getBarcodeValue = () => {
    if (!product?.meta_data) return '';
    const barcodeData = product.meta_data.find((item) => item.key === 'barcode');
    return barcodeData ? barcodeData.value : '';
  };

  // Initialisation
  useEffect(() => {
    const initialValue = getBarcodeValue();
    setLocalBarcode(initialValue || '');
  }, [product]);

  // Fonction pour mettre à jour les meta_data
  const updateBarcodeInMetaData = (newValue) => {
    const currentMetaData = watch('meta_data') || [];
    const barcodeIndex = currentMetaData.findIndex((item) => item.key === 'barcode');

    if (barcodeIndex >= 0) {
      if (newValue && newValue.trim()) {
        currentMetaData[barcodeIndex].value = newValue.trim();
      } else {
        currentMetaData.splice(barcodeIndex, 1);
      }
    } else if (newValue && newValue.trim()) {
      currentMetaData.push({
        key: 'barcode',
        value: newValue.trim(),
      });
    }

    setValue('meta_data', currentMetaData, { shouldDirty: true, shouldTouch: true });
  };

  // Handler pour les changements
  const handleBarcodeChange = (e) => {
    const newValue = e.target.value;
    setLocalBarcode(newValue);
    updateBarcodeInMetaData(newValue);
  };

  // Générer un nouveau code EAN-13
  const handleGenerateBarcode = () => {
    setIsGenerating(true);
    try {
      const newBarcode = generateEAN13({
        prefix: '200',
        productId: product?._id || product?.id,
        includeTimestamp: true,
      });

      setLocalBarcode(newBarcode);
      updateBarcodeInMetaData(newBarcode);
    } catch (error) {
      console.error('Erreur génération code-barres:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const isValidEAN13 = localBarcode ? validateEAN13(localBarcode) : true;

  return (
    <div>
      <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-6">
        <div className="flex items-center">
          <QrCode className="h-5 w-5 mr-2" />
          <span>Codes d'identification</span>
        </div>
      </h2>

      <div className="space-y-6">
        {/* Champ de saisie avec génération */}
        <BarcodeInput
          label="Code-barres EAN-13"
          value={localBarcode}
          onChange={handleBarcodeChange}
          onGenerate={handleGenerateBarcode}
          isGenerating={isGenerating}
          validateFn={validateEAN13}
          formatFn={formatEAN13}
          placeholder="Ex: 2001234567890"
          maxLength={13}
          showGenerateButton={true}
        />

        {/* Prévisualisation en temps réel */}
        {localBarcode && localBarcode.length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-600 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                Prévisualisation en temps réel
              </h3>
              <div className="flex items-center space-x-2">
                {isValidEAN13 ? (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Valide
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Invalide
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setShowPreview(!showPreview)}
                  className="flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500 transition-colors"
                >
                  {showPreview ? (
                    <EyeOff className="h-4 w-4 mr-1" />
                  ) : (
                    <Eye className="h-4 w-4 mr-1" />
                  )}
                  {showPreview ? 'Masquer' : 'Afficher'}
                </button>
              </div>
            </div>

            {showPreview && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <BarcodePreviewCard
                  value={localBarcode}
                  type="barcode"
                  title="Code-barres EAN-13"
                />
                <BarcodePreviewCard value={localBarcode} type="qrcode" title="QR Code" />
              </div>
            )}
          </div>
        )}

        {/* Conseils d'utilisation */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
            💡 À propos des codes-barres
          </h3>
          <div className="text-xs text-blue-600 dark:text-blue-300 space-y-1">
            <p>
              • Le format <strong>EAN-13</strong> est le standard international pour les produits
              commerciaux
            </p>
            <p>
              • Le <strong>QR Code</strong> peut contenir plus d'informations et être scanné par
              smartphones
            </p>
            <p>• Utilisez "Générer" pour créer automatiquement un code unique pour ce produit</p>
            <p>• Les codes sont immédiatement utilisables pour l'impression d'étiquettes</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ===== COMPOSANT PRINCIPAL =====

const BarcodeSection = ({ product, editable }) => {
  return editable ? <EditableView product={product} /> : <ReadOnlyView product={product} />;
};

export default BarcodeSection;
