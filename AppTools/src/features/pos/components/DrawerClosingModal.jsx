// src/features/pos/components/DrawerClosingModal.jsx
import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Calculator,
  AlertTriangle,
  CheckCircle,
  Euro,
  ChevronRight,
  ChevronLeft,
  Lock,
} from 'lucide-react';
import BaseModal from '../../../components/common/ui/BaseModal';
import { useDrawer } from '../../../stores/sessionStore';

const VARIANCE_THRESHOLDS = { minor: 5, significant: 20, critical: 50 };

const denominations = [
  { value: 500, type: 'billet', label: '500€' },
  { value: 200, type: 'billet', label: '200€' },
  { value: 100, type: 'billet', label: '100€' },
  { value: 50, type: 'billet', label: '50€' },
  { value: 20, type: 'billet', label: '20€' },
  { value: 10, type: 'billet', label: '10€' },
  { value: 5, type: 'billet', label: '5€' },
  { value: 2, type: 'pièce', label: '2€' },
  { value: 1, type: 'pièce', label: '1€' },
  { value: 0.5, type: 'pièce', label: '50c' },
  { value: 0.2, type: 'pièce', label: '20c' },
  { value: 0.1, type: 'pièce', label: '10c' },
  { value: 0.05, type: 'pièce', label: '5c' },
  { value: 0.02, type: 'pièce', label: '2c' },
  { value: 0.01, type: 'pièce', label: '1c' },
];

const DrawerClosingModal = ({ isOpen, onClose, onConfirm, loading = false }) => {
  const { drawer, expectedBalance } = useDrawer();
  const [currentStep, setCurrentStep] = useState(1);
  const [method, setMethod] = useState('detailed');
  const [customAmount, setCustomAmount] = useState('');
  const [denomCounts, setDenomCounts] = useState({});
  const [notes, setNotes] = useState('');
  const [varianceAccepted, setVarianceAccepted] = useState(false);

  const countedTotal =
    method === 'global'
      ? parseFloat(customAmount) || 0
      : denominations.reduce((sum, d) => sum + (denomCounts[d.value] || 0) * d.value, 0);

  const variance = countedTotal - expectedBalance;
  const absVariance = Math.abs(variance);
  const severity =
    absVariance < VARIANCE_THRESHOLDS.minor
      ? 'none'
      : absVariance < VARIANCE_THRESHOLDS.significant
        ? 'minor'
        : absVariance < VARIANCE_THRESHOLDS.critical
          ? 'significant'
          : 'critical';

  const needsValidation = absVariance >= VARIANCE_THRESHOLDS.significant;
  const needsNotes = severity === 'critical';

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setMethod('detailed');
      setCustomAmount('');
      setDenomCounts({});
      setNotes('');
      setVarianceAccepted(false);
    }
  }, [isOpen]);

  const handleCountChange = (value, count) => {
    setDenomCounts((prev) => ({ ...prev, [value]: Math.max(0, count) }));
  };

  const canProceed = () => {
    if (currentStep === 1) return countedTotal > 0;
    if (currentStep === 2) return !needsValidation || varianceAccepted;
    return true;
  };

  const handleConfirm = () => {
    if (!canProceed()) return;

    const data = {
      counted_amount: countedTotal,
      expected_amount: expectedBalance,
      variance,
      method,
      notes: notes.trim() || null,
      variance_accepted: varianceAccepted,
      denominations: method === 'detailed' ? denomCounts : {},
    };

    onConfirm(data);
  };

  const getSeverityColor = () => {
    switch (severity) {
      case 'none':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'minor':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'significant':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  // Titre dynamique avec étape
  const getModalTitle = () => {
    const steps = ['Comptage', 'Vérification', 'Confirmation'];
    return `Fermeture de caisse - ${steps[currentStep - 1]}`;
  };

  // Footer avec navigation et actions
  const footer = (
    <div className="flex justify-between w-full">
      <div>
        {currentStep > 1 && (
          <button
            onClick={() => setCurrentStep(currentStep - 1)}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Précédent</span>
          </button>
        )}
      </div>

      <div className="flex space-x-3">
        <button
          onClick={onClose}
          disabled={loading}
          className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
        >
          Annuler
        </button>

        {currentStep < 3 ? (
          <button
            onClick={() => setCurrentStep(currentStep + 1)}
            disabled={!canProceed() || loading}
            className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            <span>Suivant</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={handleConfirm}
            disabled={loading || !canProceed()}
            className="flex items-center space-x-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Fermeture...</span>
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" />
                <span>Fermer</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={getModalTitle()}
      icon={Wallet}
      footer={footer}
      maxWidth="max-w-4xl"
    >
      {/* Progression des étapes */}
      <div className="mb-6">
        <div className="flex items-center space-x-4">
          {['Comptage', 'Vérification', 'Confirmation'].map((label, i) => (
            <div key={i} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                  currentStep === i + 1
                    ? 'bg-blue-500 text-white'
                    : currentStep > i + 1
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                }`}
              >
                {i + 1}
              </div>
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{label}</span>
              {i < 2 && <ChevronRight className="h-4 w-4 mx-2 text-gray-400" />}
            </div>
          ))}
        </div>
      </div>

      {/* Contenu selon l'étape */}
      <div className="space-y-6">
        {/* Étape 1: Comptage */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex justify-between items-center">
                <span className="text-blue-900 dark:text-blue-100">Montant attendu :</span>
                <span className="font-bold text-xl text-blue-900 dark:text-blue-100">
                  {expectedBalance.toFixed(2)}€
                </span>
              </div>
            </div>

            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={method === 'detailed'}
                  onChange={() => setMethod('detailed')}
                  className="mr-2 text-blue-600"
                />
                <span className="text-gray-700 dark:text-gray-300">Comptage détaillé</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={method === 'global'}
                  onChange={() => setMethod('global')}
                  className="mr-2 text-blue-600"
                />
                <span className="text-gray-700 dark:text-gray-300">Montant global</span>
              </label>
            </div>

            {method === 'detailed' ? (
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2 text-gray-900 dark:text-gray-100">Billets</h4>
                  <div className="grid grid-cols-4 gap-2">
                    {denominations
                      .filter((d) => d.type === 'billet')
                      .map((d) => (
                        <div
                          key={d.value}
                          className="bg-gray-50 dark:bg-gray-700 p-2 rounded text-center"
                        >
                          <div className="font-bold text-gray-900 dark:text-gray-100">
                            {d.label}
                          </div>
                          <div className="flex items-center justify-center space-x-1 mt-1">
                            <button
                              onClick={() =>
                                handleCountChange(d.value, (denomCounts[d.value] || 0) - 1)
                              }
                              className="w-6 h-6 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded text-sm hover:bg-gray-300 dark:hover:bg-gray-500"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              value={denomCounts[d.value] || 0}
                              onChange={(e) =>
                                handleCountChange(d.value, parseInt(e.target.value) || 0)
                              }
                              className="w-12 text-center border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100"
                              min="0"
                            />
                            <button
                              onClick={() =>
                                handleCountChange(d.value, (denomCounts[d.value] || 0) + 1)
                              }
                              className="w-6 h-6 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded text-sm hover:bg-gray-300 dark:hover:bg-gray-500"
                            >
                              +
                            </button>
                          </div>
                          <div className="text-xs mt-1 text-gray-600 dark:text-gray-400">
                            {((denomCounts[d.value] || 0) * d.value).toFixed(2)}€
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2 text-gray-900 dark:text-gray-100">Pièces</h4>
                  <div className="grid grid-cols-5 gap-2">
                    {denominations
                      .filter((d) => d.type === 'pièce')
                      .map((d) => (
                        <div
                          key={d.value}
                          className="bg-gray-50 dark:bg-gray-700 p-2 rounded text-center"
                        >
                          <div className="font-bold text-sm text-gray-900 dark:text-gray-100">
                            {d.label}
                          </div>
                          <div className="flex items-center justify-center space-x-1 mt-1">
                            <button
                              onClick={() =>
                                handleCountChange(d.value, (denomCounts[d.value] || 0) - 1)
                              }
                              className="w-5 h-5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded text-xs hover:bg-gray-300 dark:hover:bg-gray-500"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              value={denomCounts[d.value] || 0}
                              onChange={(e) =>
                                handleCountChange(d.value, parseInt(e.target.value) || 0)
                              }
                              className="w-10 text-center border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100"
                              min="0"
                            />
                            <button
                              onClick={() =>
                                handleCountChange(d.value, (denomCounts[d.value] || 0) + 1)
                              }
                              className="w-5 h-5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded text-xs hover:bg-gray-300 dark:hover:bg-gray-500"
                            >
                              +
                            </button>
                          </div>
                          <div className="text-xs mt-1 text-gray-600 dark:text-gray-400">
                            {((denomCounts[d.value] || 0) * d.value).toFixed(2)}€
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Montant total compté
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={customAmount}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                        setCustomAmount(value);
                      }
                    }}
                    placeholder="0.00"
                    className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg text-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <Euro className="absolute right-4 top-3.5 h-5 w-5 text-gray-400" />
                </div>
              </div>
            )}

            <div className={`p-4 rounded-lg border-2 ${getSeverityColor()}`}>
              <div className="flex justify-between items-center">
                <span className="font-medium">Montant compté :</span>
                <span className="text-2xl font-bold">{countedTotal.toFixed(2)}€</span>
              </div>
            </div>
          </div>
        )}

        {/* Étape 2: Vérification */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-gray-700 dark:text-gray-300">
                  Attendu : <span className="font-semibold">{expectedBalance.toFixed(2)}€</span>
                </div>
                <div className="text-gray-700 dark:text-gray-300">
                  Compté : <span className="font-semibold">{countedTotal.toFixed(2)}€</span>
                </div>
              </div>
            </div>

            <div className={`border-2 rounded-lg p-4 ${getSeverityColor()}`}>
              <div className="text-center">
                <div className="text-3xl font-bold">
                  {variance > 0 ? '+' : ''}
                  {variance.toFixed(2)}€
                </div>
                <p className="text-sm">
                  {variance > 0 ? 'Excédent' : variance < 0 ? 'Manquant' : 'Équilibré'}
                </p>
              </div>
            </div>

            {needsValidation && (
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                <div className="flex items-center text-orange-800 dark:text-orange-200 mb-3">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  <span className="font-medium">Validation d'écart requise</span>
                </div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={varianceAccepted}
                    onChange={(e) => setVarianceAccepted(e.target.checked)}
                    className="text-blue-600"
                  />
                  <span className="text-sm text-orange-800 dark:text-orange-200">
                    Je valide cet écart de {absVariance.toFixed(2)}€
                  </span>
                </label>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notes {needsNotes && <span className="text-red-500">*</span>}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={needsNotes ? 'Justification obligatoire...' : 'Notes optionnelles...'}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        )}

        {/* Étape 3: Confirmation */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="text-center">
              <Lock className="h-12 w-12 text-red-600 mx-auto mb-4" />
              <h4 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">
                Confirmer la fermeture
              </h4>
              <p className="text-gray-600 dark:text-gray-400">
                Cette action fermera définitivement votre session
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-gray-700 dark:text-gray-300">
                <span>Ouverture :</span>
                <span>{drawer?.openingAmount?.toFixed(2) || '0.00'}€</span>
              </div>
              <div className="flex justify-between text-gray-700 dark:text-gray-300">
                <span>Attendu :</span>
                <span>{expectedBalance.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between text-gray-700 dark:text-gray-300">
                <span>Compté :</span>
                <span>{countedTotal.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between font-bold border-t border-gray-200 dark:border-gray-600 pt-2">
                <span className="text-gray-900 dark:text-gray-100">Écart :</span>
                <span className={variance >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {variance > 0 ? '+' : ''}
                  {variance.toFixed(2)}€
                </span>
              </div>
            </div>

            {notes && (
              <div className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded p-3">
                <strong className="text-gray-900 dark:text-gray-100">Notes :</strong>{' '}
                <span className="text-gray-700 dark:text-gray-300">{notes}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </BaseModal>
  );
};

export default DrawerClosingModal;
