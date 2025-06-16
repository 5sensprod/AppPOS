// src/features/pos/components/DrawerClosingModal.jsx
import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Calculator,
  AlertTriangle,
  CheckCircle,
  Euro,
  X,
  ChevronRight,
  ChevronLeft,
  Lock,
} from 'lucide-react';
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

  if (!isOpen) return null;

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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Wallet className="h-6 w-6 text-red-600" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Fermeture de caisse
              </h3>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Steps */}
          <div className="flex items-center space-x-4 mt-4">
            {['Comptage', 'Vérification', 'Confirmation'].map((label, i) => (
              <div key={i} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    currentStep === i + 1
                      ? 'bg-blue-500 text-white'
                      : currentStep > i + 1
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-300 text-gray-600'
                  }`}
                >
                  {i + 1}
                </div>
                <span className="ml-2 text-sm">{label}</span>
                {i < 2 && <ChevronRight className="h-4 w-4 mx-2 text-gray-400" />}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Step 1: Counting */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span>Montant attendu :</span>
                  <span className="font-bold text-xl">{expectedBalance.toFixed(2)}€</span>
                </div>
              </div>

              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={method === 'detailed'}
                    onChange={() => setMethod('detailed')}
                    className="mr-2"
                  />
                  Comptage détaillé
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={method === 'global'}
                    onChange={() => setMethod('global')}
                    className="mr-2"
                  />
                  Montant global
                </label>
              </div>

              {method === 'detailed' ? (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Billets</h4>
                    <div className="grid grid-cols-4 gap-2">
                      {denominations
                        .filter((d) => d.type === 'billet')
                        .map((d) => (
                          <div key={d.value} className="bg-gray-50 p-2 rounded text-center">
                            <div className="font-bold">{d.label}</div>
                            <div className="flex items-center justify-center space-x-1 mt-1">
                              <button
                                onClick={() =>
                                  handleCountChange(d.value, (denomCounts[d.value] || 0) - 1)
                                }
                                className="w-6 h-6 bg-gray-200 rounded text-sm"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                value={denomCounts[d.value] || 0}
                                onChange={(e) =>
                                  handleCountChange(d.value, parseInt(e.target.value) || 0)
                                }
                                className="w-12 text-center border rounded"
                                min="0"
                              />
                              <button
                                onClick={() =>
                                  handleCountChange(d.value, (denomCounts[d.value] || 0) + 1)
                                }
                                className="w-6 h-6 bg-gray-200 rounded text-sm"
                              >
                                +
                              </button>
                            </div>
                            <div className="text-xs mt-1">
                              {((denomCounts[d.value] || 0) * d.value).toFixed(2)}€
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Pièces</h4>
                    <div className="grid grid-cols-5 gap-2">
                      {denominations
                        .filter((d) => d.type === 'pièce')
                        .map((d) => (
                          <div key={d.value} className="bg-gray-50 p-2 rounded text-center">
                            <div className="font-bold text-sm">{d.label}</div>
                            <div className="flex items-center justify-center space-x-1 mt-1">
                              <button
                                onClick={() =>
                                  handleCountChange(d.value, (denomCounts[d.value] || 0) - 1)
                                }
                                className="w-5 h-5 bg-gray-200 rounded text-xs"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                value={denomCounts[d.value] || 0}
                                onChange={(e) =>
                                  handleCountChange(d.value, parseInt(e.target.value) || 0)
                                }
                                className="w-10 text-center border rounded text-xs"
                                min="0"
                              />
                              <button
                                onClick={() =>
                                  handleCountChange(d.value, (denomCounts[d.value] || 0) + 1)
                                }
                                className="w-5 h-5 bg-gray-200 rounded text-xs"
                              >
                                +
                              </button>
                            </div>
                            <div className="text-xs mt-1">
                              {((denomCounts[d.value] || 0) * d.value).toFixed(2)}€
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium mb-2">Montant total compté</label>
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
                      className="w-full px-4 py-3 pr-12 border rounded-lg text-lg"
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

          {/* Step 2: Verification */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>Attendu : {expectedBalance.toFixed(2)}€</div>
                  <div>Compté : {countedTotal.toFixed(2)}€</div>
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
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-center text-orange-800 mb-3">
                    <AlertTriangle className="h-5 w-5 mr-2" />
                    <span className="font-medium">Validation d'écart requise</span>
                  </div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={varianceAccepted}
                      onChange={(e) => setVarianceAccepted(e.target.checked)}
                    />
                    <span className="text-sm">
                      Je valide cet écart de {absVariance.toFixed(2)}€
                    </span>
                  </label>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">
                  Notes {needsNotes && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={
                    needsNotes ? 'Justification obligatoire...' : 'Notes optionnelles...'
                  }
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg resize-none"
                />
              </div>
            </div>
          )}

          {/* Step 3: Confirmation */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <Lock className="h-12 w-12 text-red-600 mx-auto mb-4" />
                <h4 className="text-xl font-semibold mb-2">Confirmer la fermeture</h4>
                <p className="text-gray-600">Cette action fermera définitivement votre session</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span>Ouverture :</span>
                  <span>{drawer?.openingAmount?.toFixed(2) || '0.00'}€</span>
                </div>
                <div className="flex justify-between">
                  <span>Attendu :</span>
                  <span>{expectedBalance.toFixed(2)}€</span>
                </div>
                <div className="flex justify-between">
                  <span>Compté :</span>
                  <span>{countedTotal.toFixed(2)}€</span>
                </div>
                <div className="flex justify-between font-bold border-t pt-2">
                  <span>Écart :</span>
                  <span className={variance >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {variance > 0 ? '+' : ''}
                    {variance.toFixed(2)}€
                  </span>
                </div>
              </div>

              {notes && (
                <div className="bg-white border rounded p-3">
                  <strong>Notes :</strong> {notes}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between p-6 border-t">
          <div>
            {currentStep > 1 && (
              <button
                onClick={() => setCurrentStep(currentStep - 1)}
                disabled={loading}
                className="flex items-center space-x-2 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
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
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
            >
              Annuler
            </button>

            {currentStep < 3 ? (
              <button
                onClick={() => setCurrentStep(currentStep + 1)}
                disabled={!canProceed() || loading}
                className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              >
                <span>Suivant</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={handleConfirm}
                disabled={loading || !canProceed()}
                className="flex items-center space-x-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400"
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
      </div>
    </div>
  );
};

export default DrawerClosingModal;
