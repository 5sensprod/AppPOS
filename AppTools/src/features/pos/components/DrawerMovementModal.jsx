// src/features/pos/components/DrawerMovementModal.jsx
import React, { useState, useEffect } from 'react';
import {
  ArrowUpCircle,
  ArrowDownCircle,
  Euro,
  FileText,
  AlertTriangle,
  Calculator,
  TrendingUp,
} from 'lucide-react';
import BaseModal from '../../../components/common/ui/BaseModal';
import { useDrawer } from '../../../stores/sessionStore';

// ✅ Configuration des types de mouvements
const MOVEMENT_TYPES = {
  in: {
    label: 'Entrée de caisse',
    icon: ArrowUpCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800',
    reasons: [
      'Appoint en début de journée',
      'Remboursement reçu',
      'Erreur de caisse (ajout)',
      'Dépôt de fonds',
      'Vente non enregistrée',
      'Autre (préciser)',
    ],
  },
  out: {
    label: 'Sortie de caisse',
    icon: ArrowDownCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800',
    reasons: [
      'Remboursement client',
      'Achat urgent',
      'Erreur de caisse (retrait)',
      'Dépôt en banque',
      'Frais divers',
      'Autre (préciser)',
    ],
  },
};

const DrawerMovementModal = () => {
  const {
    showDrawerMovementModal,
    setShowDrawerMovementModal,
    addCashMovement,
    drawerLoading,
    drawerError,
    drawerBalance,
  } = useDrawer();

  const [formData, setFormData] = useState({
    type: 'in',
    amount: '',
    reason: '',
    notes: '',
  });

  const [errors, setErrors] = useState({});

  // Reset form when modal opens
  useEffect(() => {
    if (showDrawerMovementModal) {
      setFormData({
        type: 'in',
        amount: '',
        reason: '',
        notes: '',
      });
      setErrors({});
    }
  }, [showDrawerMovementModal]);

  // Validation du formulaire
  const validateForm = () => {
    const newErrors = {};

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Montant requis et doit être positif';
    }

    if (!formData.reason || formData.reason.trim() === '') {
      newErrors.reason = 'Raison requise';
    }

    if (
      formData.reason === 'Autre (préciser)' &&
      (!formData.notes || formData.notes.trim() === '')
    ) {
      newErrors.notes = 'Précision requise pour "Autre"';
    }

    // Vérifier le solde pour les sorties
    if (formData.type === 'out') {
      const amount = parseFloat(formData.amount);
      if (amount > drawerBalance) {
        newErrors.amount = `Solde insuffisant (${drawerBalance.toFixed(2)}€ disponible)`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      await addCashMovement({
        type: formData.type,
        amount: parseFloat(formData.amount),
        reason: formData.reason,
        notes: formData.notes.trim() || null,
      });

      // Fermer la modal après succès
      setShowDrawerMovementModal(false);
    } catch (error) {
      console.error('Erreur ajout mouvement:', error);
    }
  };

  const handleClose = () => {
    setShowDrawerMovementModal(false);
  };

  const handleAmountChange = (e) => {
    const value = e.target.value;
    // Permettre seulement les nombres et décimales
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setFormData((prev) => ({ ...prev, amount: value }));
      if (errors.amount) {
        setErrors((prev) => ({ ...prev, amount: '' }));
      }
    }
  };

  const handleReasonChange = (e) => {
    setFormData((prev) => ({ ...prev, reason: e.target.value }));
    if (errors.reason) {
      setErrors((prev) => ({ ...prev, reason: '' }));
    }
  };

  const currentType = MOVEMENT_TYPES[formData.type];
  const newBalance =
    formData.type === 'in'
      ? drawerBalance + (parseFloat(formData.amount) || 0)
      : drawerBalance - (parseFloat(formData.amount) || 0);

  // Footer avec les boutons d'action
  const footer = (
    <>
      <button
        type="button"
        onClick={handleClose}
        disabled={drawerLoading}
        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors disabled:opacity-50"
      >
        Annuler
      </button>
      <button
        type="submit"
        form="movement-form"
        disabled={drawerLoading || !formData.amount || !formData.reason}
        className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-md transition-colors"
      >
        {drawerLoading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span>Traitement...</span>
          </>
        ) : (
          <>
            <Calculator className="h-4 w-4" />
            <span>Enregistrer</span>
          </>
        )}
      </button>
    </>
  );

  return (
    <BaseModal
      isOpen={showDrawerMovementModal}
      onClose={handleClose}
      title="Mouvement de caisse"
      icon={TrendingUp}
      footer={footer}
      maxWidth="max-w-md"
    >
      <form id="movement-form" onSubmit={handleSubmit} className="space-y-6">
        {/* Type de mouvement */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Type de mouvement
          </label>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(MOVEMENT_TYPES).map(([type, config]) => {
              const Icon = config.icon;
              return (
                <label
                  key={type}
                  className={`relative flex items-center justify-center p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                    formData.type === type
                      ? `${config.bgColor} ${config.color}`
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    value={type}
                    checked={formData.type === type}
                    onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value }))}
                    className="sr-only"
                  />
                  <Icon className="h-5 w-5 mr-2" />
                  <span className="font-medium text-sm">{config.label}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Montant */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Montant
          </label>
          <div className="relative">
            <input
              type="text"
              value={formData.amount}
              onChange={handleAmountChange}
              placeholder="0.00"
              className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                errors.amount
                  ? 'border-red-300 dark:border-red-600'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
            />
            <Euro className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
          {errors.amount && (
            <p className="text-sm text-red-600 dark:text-red-400">{errors.amount}</p>
          )}
        </div>

        {/* Raison */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Raison
          </label>
          <select
            value={formData.reason}
            onChange={handleReasonChange}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
              errors.reason
                ? 'border-red-300 dark:border-red-600'
                : 'border-gray-300 dark:border-gray-600'
            }`}
          >
            <option value="">Sélectionner une raison</option>
            {currentType.reasons.map((reason) => (
              <option key={reason} value={reason}>
                {reason}
              </option>
            ))}
          </select>
          {errors.reason && (
            <p className="text-sm text-red-600 dark:text-red-400">{errors.reason}</p>
          )}
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Notes{' '}
            {formData.reason === 'Autre (préciser)' && <span className="text-red-500">*</span>}
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => {
              setFormData((prev) => ({ ...prev, notes: e.target.value }));
              if (errors.notes) {
                setErrors((prev) => ({ ...prev, notes: '' }));
              }
            }}
            placeholder={
              formData.reason === 'Autre (préciser)'
                ? 'Précisez la raison...'
                : 'Notes optionnelles...'
            }
            rows={3}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none ${
              errors.notes
                ? 'border-red-300 dark:border-red-600'
                : 'border-gray-300 dark:border-gray-600'
            }`}
          />
          {errors.notes && <p className="text-sm text-red-600 dark:text-red-400">{errors.notes}</p>}
        </div>

        {/* Aperçu du nouveau solde */}
        {formData.amount && !errors.amount && (
          <div
            className={`p-3 rounded-lg border ${
              newBalance >= 0
                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Nouveau solde :
              </span>
              <span
                className={`font-bold ${
                  newBalance >= 0
                    ? 'text-blue-700 dark:text-blue-300'
                    : 'text-red-700 dark:text-red-300'
                }`}
              >
                {newBalance.toFixed(2)}€
              </span>
            </div>
          </div>
        )}

        {/* Erreur globale */}
        {drawerError && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
              <span className="text-sm text-red-700 dark:text-red-300">{drawerError}</span>
            </div>
          </div>
        )}
      </form>
    </BaseModal>
  );
};

export default DrawerMovementModal;
