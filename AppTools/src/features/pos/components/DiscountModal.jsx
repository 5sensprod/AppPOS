// src/features/pos/components/DiscountModal.jsx - AVEC VALIDATION PERMISSIONS
import React, { useState, useEffect } from 'react';
import { Percent, Check, X, AlertCircle } from 'lucide-react';
import BaseModal from '../../../components/common/ui/BaseModal';
import { usePermissions } from '../../../contexts/PermissionsProvider';
import { validateDiscount } from '../../../hooks/useRolePermissions';

const DiscountModal = ({
  isOpen,
  onClose,
  onApply,
  discountType, // 'item' ou 'ticket'
  itemData = null,
  currentDiscount = null,
  cartTotal = 0,
  userRole = 'user', // ✅ NOUVEAU
  discountPermissions = null, // ✅ NOUVEAU
}) => {
  const { permissions } = usePermissions();
  const [discountMethod, setDiscountMethod] = useState('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [discountReason, setDiscountReason] = useState('');
  const [errors, setErrors] = useState({});
  const [validationError, setValidationError] = useState(null); // ✅ NOUVEAU

  const predefinedReasons = [
    'Client fidèle',
    'Geste commercial',
    'Promotion en cours',
    'Défaut produit',
    'Fin de série',
    'Personnel',
    'Autre',
  ];

  // ✅ OBTENIR LES LIMITES SELON LE RÔLE
  const getMaxValues = () => {
    if (!discountPermissions) return { maxPercent: 100, maxAmount: null };

    if (discountType === 'item') {
      return {
        maxPercent: discountPermissions.maxItemDiscountPercent,
        maxAmount: discountPermissions.maxItemDiscountAmount,
      };
    } else {
      return {
        maxPercent: discountPermissions.maxTicketDiscountPercent,
        maxAmount: discountPermissions.maxTicketDiscountAmount,
      };
    }
  };

  const { maxPercent, maxAmount } = getMaxValues();
  const requiresReason = discountPermissions?.requiresReason || false;

  useEffect(() => {
    if (isOpen) {
      if (currentDiscount) {
        setDiscountMethod(currentDiscount.type);
        setDiscountValue(currentDiscount.value.toString());
        setDiscountReason(currentDiscount.reason || '');
      } else {
        setDiscountMethod('percentage');
        setDiscountValue('');
        setDiscountReason('');
      }
      setErrors({});
      setValidationError(null);
    }
  }, [isOpen, currentDiscount]);

  // ✅ VALIDATION AVEC LIMITES DU RÔLE
  const validateForm = () => {
    const newErrors = {};
    setValidationError(null);

    const value = parseFloat(discountValue);
    if (!discountValue || isNaN(value) || value <= 0) {
      newErrors.value = 'Valeur de réduction requise et positive';
    } else {
      // ✅ VALIDATION POURCENTAGE SELON RÔLE
      if (discountMethod === 'percentage') {
        if (value > 100) {
          newErrors.value = 'Pourcentage maximum : 100%';
        } else if (value > maxPercent) {
          newErrors.value = `Pourcentage maximum autorisé pour votre rôle : ${maxPercent}%`;
        }
      }

      // ✅ VALIDATION MONTANT FIXE SELON RÔLE
      if (discountMethod === 'fixed') {
        if (itemData && value > itemData.total_price) {
          newErrors.value = "Réduction fixe ne peut dépasser le prix de l'article";
        } else if (maxAmount !== null && value > maxAmount) {
          newErrors.value = `Montant maximum autorisé pour votre rôle : ${maxAmount}€`;
        }
      }
    }

    // ✅ VALIDATION MOTIF SELON RÔLE
    if (requiresReason && !discountReason.trim()) {
      newErrors.reason = 'Motif de réduction obligatoire pour votre rôle';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    const discountData = {
      type: discountMethod,
      value: parseFloat(discountValue),
      reason: discountReason.trim(),
    };

    // ✅ VALIDATION FINALE AVEC LA FONCTION CENTRALISÉE
    const itemPrice = itemData?.total_price || 0;
    const validation = validateDiscount(
      permissions,
      userRole,
      discountType,
      discountData,
      itemPrice
    );

    if (!validation.valid) {
      setValidationError(validation.error);
      return;
    }

    onApply(discountData);
    onClose();
  };

  const handleRemoveDiscount = () => {
    onApply(null);
    onClose();
  };

  const calculatePreview = () => {
    const value = parseFloat(discountValue);
    if (!value || isNaN(value)) return null;

    let discountAmount = 0;
    let baseAmount = 0;

    if (discountType === 'item' && itemData && itemData.total_price !== undefined) {
      baseAmount = itemData.total_price;
      if (discountMethod === 'percentage') {
        discountAmount = (baseAmount * value) / 100;
      } else {
        discountAmount = Math.min(value, baseAmount);
      }
    } else if (discountType === 'ticket' && cartTotal > 0) {
      baseAmount = cartTotal;
      if (discountMethod === 'percentage') {
        discountAmount = (baseAmount * value) / 100;
      } else {
        discountAmount = Math.min(value, baseAmount);
      }
    } else {
      return null;
    }

    if (isNaN(baseAmount) || isNaN(discountAmount)) {
      return null;
    }

    return {
      baseAmount: Math.round(baseAmount * 100) / 100,
      discountAmount: Math.round(discountAmount * 100) / 100,
      finalAmount: Math.round((baseAmount - discountAmount) * 100) / 100,
    };
  };

  const preview = calculatePreview();

  if (!isOpen) return null;

  const title =
    discountType === 'item'
      ? `Réduction - ${itemData?.product_name || 'Article'}`
      : 'Réduction globale du ticket';

  const footer = (
    <>
      <button
        onClick={onClose}
        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
      >
        Annuler
      </button>

      {currentDiscount && (
        <button
          onClick={handleRemoveDiscount}
          className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
        >
          <X className="h-4 w-4" />
          <span>Supprimer</span>
        </button>
      )}

      <button
        onClick={handleSubmit}
        className="flex items-center space-x-2 px-6 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
      >
        <Check className="h-4 w-4" />
        <span>{currentDiscount ? 'Modifier' : 'Appliquer'}</span>
      </button>
    </>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      icon={Percent}
      footer={footer}
      maxWidth="max-w-md"
    >
      <div className="space-y-6">
        {/* ✅ AFFICHAGE DES LIMITES DU RÔLE */}
        {discountPermissions && (maxPercent < 100 || maxAmount !== null) && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800 dark:text-yellow-200">
                <p className="font-medium mb-1">Limites pour votre rôle ({userRole}) :</p>
                <ul className="list-disc list-inside space-y-1">
                  {maxPercent < 100 && <li>Réduction maximale : {maxPercent}%</li>}
                  {maxAmount !== null && <li>Montant maximal : {maxAmount}€</li>}
                  {requiresReason && <li>Motif obligatoire</li>}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ✅ ERREUR DE VALIDATION GLOBALE */}
        {validationError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <X className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800 dark:text-red-200">{validationError}</p>
            </div>
          </div>
        )}

        {/* Type de réduction */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Type de réduction
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label
              className={`flex items-center justify-center p-3 border rounded-lg cursor-pointer transition-colors ${
                discountMethod === 'percentage'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <input
                type="radio"
                value="percentage"
                checked={discountMethod === 'percentage'}
                onChange={(e) => setDiscountMethod(e.target.value)}
                className="sr-only"
              />
              <div className="text-center">
                <Percent className="h-5 w-5 mx-auto mb-1 text-blue-600" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Pourcentage
                </span>
                {maxPercent < 100 && (
                  <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1">
                    max {maxPercent}%
                  </span>
                )}
              </div>
            </label>

            <label
              className={`flex items-center justify-center p-3 border rounded-lg cursor-pointer transition-colors ${
                discountMethod === 'fixed'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <input
                type="radio"
                value="fixed"
                checked={discountMethod === 'fixed'}
                onChange={(e) => setDiscountMethod(e.target.value)}
                className="sr-only"
              />
              <div className="text-center">
                <span className="block text-lg font-bold mb-1 text-blue-600">€</span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Montant fixe
                </span>
                {maxAmount !== null && (
                  <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1">
                    max {maxAmount}€
                  </span>
                )}
              </div>
            </label>
          </div>
        </div>

        {/* Valeur de réduction */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Valeur {discountMethod === 'percentage' ? '(%)' : '(€)'}
          </label>
          <div className="relative">
            <input
              type="number"
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              placeholder={discountMethod === 'percentage' ? '10' : '5.00'}
              step={discountMethod === 'percentage' ? '1' : '0.01'}
              min="0"
              max={discountMethod === 'percentage' ? maxPercent : maxAmount || undefined}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                errors.value ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            <span className="absolute right-3 top-2.5 text-gray-500 dark:text-gray-400">
              {discountMethod === 'percentage' ? '%' : '€'}
            </span>
          </div>
          {errors.value && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.value}</p>
          )}
        </div>

        {/* Motif de réduction */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Motif de la réduction {requiresReason && <span className="text-red-500">*</span>}
          </label>
          <div className="space-y-2">
            <select
              value={predefinedReasons.includes(discountReason) ? discountReason : 'Autre'}
              onChange={(e) => {
                if (e.target.value === 'Autre') {
                  setDiscountReason('');
                } else {
                  setDiscountReason(e.target.value);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
              {predefinedReasons.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </select>

            {!predefinedReasons.includes(discountReason) && (
              <input
                type="text"
                value={discountReason}
                onChange={(e) => setDiscountReason(e.target.value)}
                placeholder="Saisir le motif..."
                className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                  errors.reason ? 'border-red-500' : 'border-gray-300'
                }`}
              />
            )}
          </div>
          {errors.reason && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.reason}</p>
          )}
        </div>

        {/* Aperçu du calcul */}
        {preview && preview.baseAmount !== undefined && preview.discountAmount !== undefined && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
              Aperçu du calcul
            </h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>{discountType === 'item' ? 'Prix original :' : 'Sous-total :'}</span>
                <span>{preview.baseAmount.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between text-red-600 dark:text-red-400">
                <span>Réduction :</span>
                <span>-{preview.discountAmount.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between font-medium text-green-600 dark:text-green-400 border-t pt-1">
                <span>{discountType === 'item' ? 'Prix final :' : 'Total final :'}</span>
                <span>{preview.finalAmount.toFixed(2)}€</span>
              </div>
            </div>
          </div>
        )}

        {/* Message d'information */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {discountType === 'item'
              ? 'Cette réduction sera appliquée uniquement à cet article.'
              : 'Cette réduction sera appliquée au total du ticket après les réductions individuelles.'}
          </p>
        </div>
      </div>
    </BaseModal>
  );
};

export default DiscountModal;
