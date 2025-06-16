// src/features/pos/components/SessionOpeningModal.jsx - Workflow unifié session + fond de caisse
import React, { useState, useEffect } from 'react';
import {
  Monitor,
  Wallet,
  ChevronRight,
  ChevronLeft,
  Check,
  Calculator,
  Euro,
  Coins,
  Clock,
  X,
} from 'lucide-react';

const SessionOpeningModal = ({
  isOpen,
  onClose,
  onConfirm,
  loading = false,
  lcdPorts = [],
  lcdPreselected = false,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [sessionData, setSessionData] = useState({
    // Configuration LCD
    useLCD: false,
    lcdPort: '',
    lcdConfig: {
      baudRate: 9600,
      dataBits: 8,
      parity: 'none',
      stopBits: 1,
    },
    // Fond de caisse
    drawer: {
      opening_amount: 0,
      denominations: {},
      method: 'detailed', // 'detailed' ou 'custom'
      notes: '',
    },
  });

  // Dénominations euros
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

  const [customAmount, setCustomAmount] = useState('');

  // Réinitialiser au montage
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setSessionData({
        useLCD: lcdPreselected,
        lcdPort: lcdPorts.length > 0 ? lcdPorts[0].path : '',
        lcdConfig: {
          baudRate: 9600,
          dataBits: 8,
          parity: 'none',
          stopBits: 1,
        },
        drawer: {
          opening_amount: 0,
          denominations: {},
          method: 'detailed',
          notes: '',
        },
      });
      setCustomAmount('');
    }
  }, [isOpen, lcdPorts, lcdPreselected]);

  // Calculer le total du fond de caisse
  const calculateDrawerTotal = () => {
    if (sessionData.drawer.method === 'custom') {
      return parseFloat(customAmount) || 0;
    }

    return denominations.reduce((total, denom) => {
      const count = sessionData.drawer.denominations[denom.value] || 0;
      return total + denom.value * count;
    }, 0);
  };

  const drawerTotal = calculateDrawerTotal();

  // Mettre à jour le montant d'ouverture
  useEffect(() => {
    setSessionData((prev) => ({
      ...prev,
      drawer: {
        ...prev.drawer,
        opening_amount: drawerTotal,
      },
    }));
  }, [drawerTotal]);

  const handleCountChange = (value, newCount) => {
    setSessionData((prev) => ({
      ...prev,
      drawer: {
        ...prev.drawer,
        denominations: {
          ...prev.drawer.denominations,
          [value]: Math.max(0, newCount),
        },
      },
    }));
  };

  const handleCustomAmountChange = (e) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setCustomAmount(value);
    }
  };

  const canProceedFromStep = (step) => {
    switch (step) {
      case 1: // Configuration générale - toujours OK
        return true;
      case 2: // Fond de caisse - montant > 0 requis
        return drawerTotal > 0;
      default:
        return true;
    }
  };

  const handleConfirm = () => {
    const finalData = {
      ...sessionData,
      drawer: {
        ...sessionData.drawer,
        opening_amount: drawerTotal,
        denominations:
          sessionData.drawer.method === 'detailed' ? sessionData.drawer.denominations : {},
      },
    };

    onConfirm(finalData);
  };

  if (!isOpen) return null;

  const steps = [
    { id: 1, title: 'Configuration', icon: Monitor },
    { id: 2, title: 'Fond de caisse', icon: Wallet },
    { id: 3, title: 'Récapitulatif', icon: Check },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* En-tête avec progression */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                Démarrer la journée
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Configuration de votre session de caisse
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-gray-500 dark:text-gray-400">
                <Clock className="h-5 w-5 mr-2" />
                <span>
                  {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Progression */}
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                    currentStep === step.id
                      ? 'border-blue-500 bg-blue-500 text-white'
                      : currentStep > step.id
                        ? 'border-green-500 bg-green-500 text-white'
                        : 'border-gray-300 dark:border-gray-600 text-gray-300 dark:text-gray-600'
                  }`}
                >
                  {currentStep > step.id ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <step.icon className="h-5 w-5" />
                  )}
                </div>
                <span
                  className={`ml-3 font-medium ${
                    currentStep >= step.id
                      ? 'text-gray-900 dark:text-white'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {step.title}
                </span>
                {index < steps.length - 1 && (
                  <ChevronRight className="h-5 w-5 text-gray-300 dark:text-gray-600 mx-4" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Contenu selon l'étape */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Étape 1: Configuration */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Configuration de session
                </h4>

                {/* Option LCD */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <Monitor className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      <div>
                        <h5 className="font-medium text-gray-900 dark:text-white">
                          Afficheur client LCD
                        </h5>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Connecter un écran LCD pour afficher les prix aux clients
                        </p>
                      </div>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sessionData.useLCD}
                        onChange={(e) =>
                          setSessionData((prev) => ({ ...prev, useLCD: e.target.checked }))
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {sessionData.useLCD && (
                    <div className="space-y-4 pl-9">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Port série
                        </label>
                        <select
                          value={sessionData.lcdPort}
                          onChange={(e) =>
                            setSessionData((prev) => ({ ...prev, lcdPort: e.target.value }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                   bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                                   focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Sélectionner un port</option>
                          {lcdPorts.map((port) => (
                            <option key={port.path} value={port.path}>
                              {port.path} - {port.description}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Étape 2: Fond de caisse */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Déclaration du fond de caisse
                </h4>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Déclarez le montant initial présent dans votre caisse
                </p>

                {/* Mode de saisie */}
                <div className="mb-6">
                  <div className="flex space-x-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        checked={sessionData.drawer.method === 'detailed'}
                        onChange={() =>
                          setSessionData((prev) => ({
                            ...prev,
                            drawer: { ...prev.drawer, method: 'detailed' },
                          }))
                        }
                        className="form-radio"
                      />
                      <span className="text-gray-700 dark:text-gray-300">Comptage détaillé</span>
                    </label>

                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        checked={sessionData.drawer.method === 'custom'}
                        onChange={() =>
                          setSessionData((prev) => ({
                            ...prev,
                            drawer: { ...prev.drawer, method: 'custom' },
                          }))
                        }
                        className="form-radio"
                      />
                      <span className="text-gray-700 dark:text-gray-300">Montant global</span>
                    </label>
                  </div>
                </div>

                {/* Saisie détaillée */}
                {sessionData.drawer.method === 'detailed' && (
                  <div className="space-y-6">
                    {/* Billets */}
                    <div>
                      <h5 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                        <Euro className="h-5 w-5 mr-2" />
                        Billets
                      </h5>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {denominations
                          .filter((d) => d.type === 'billet')
                          .map((denom) => (
                            <div
                              key={denom.value}
                              className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3"
                            >
                              <div className="text-center mb-2">
                                <span className="font-bold text-lg text-gray-900 dark:text-white">
                                  {denom.label}
                                </span>
                              </div>
                              <div className="flex items-center justify-center space-x-2">
                                <button
                                  onClick={() =>
                                    handleCountChange(
                                      denom.value,
                                      (sessionData.drawer.denominations[denom.value] || 0) - 1
                                    )
                                  }
                                  className="w-8 h-8 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  value={sessionData.drawer.denominations[denom.value] || 0}
                                  onChange={(e) =>
                                    handleCountChange(denom.value, parseInt(e.target.value) || 0)
                                  }
                                  className="w-16 text-center border rounded dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                                  min="0"
                                />
                                <button
                                  onClick={() =>
                                    handleCountChange(
                                      denom.value,
                                      (sessionData.drawer.denominations[denom.value] || 0) + 1
                                    )
                                  }
                                  className="w-8 h-8 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
                                >
                                  +
                                </button>
                              </div>
                              <div className="text-center mt-2 text-sm text-gray-600 dark:text-gray-400">
                                {(
                                  (sessionData.drawer.denominations[denom.value] || 0) * denom.value
                                ).toFixed(2)}
                                €
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>

                    {/* Pièces */}
                    <div>
                      <h5 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                        <Coins className="h-5 w-5 mr-2" />
                        Pièces
                      </h5>
                      <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                        {denominations
                          .filter((d) => d.type === 'pièce')
                          .map((denom) => (
                            <div
                              key={denom.value}
                              className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3"
                            >
                              <div className="text-center mb-2">
                                <span className="font-bold text-gray-900 dark:text-white">
                                  {denom.label}
                                </span>
                              </div>
                              <div className="flex items-center justify-center space-x-1">
                                <button
                                  onClick={() =>
                                    handleCountChange(
                                      denom.value,
                                      (sessionData.drawer.denominations[denom.value] || 0) - 1
                                    )
                                  }
                                  className="w-6 h-6 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded text-xs hover:bg-gray-300 dark:hover:bg-gray-500"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  value={sessionData.drawer.denominations[denom.value] || 0}
                                  onChange={(e) =>
                                    handleCountChange(denom.value, parseInt(e.target.value) || 0)
                                  }
                                  className="w-12 text-center border rounded text-sm dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                                  min="0"
                                />
                                <button
                                  onClick={() =>
                                    handleCountChange(
                                      denom.value,
                                      (sessionData.drawer.denominations[denom.value] || 0) + 1
                                    )
                                  }
                                  className="w-6 h-6 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded text-xs hover:bg-gray-300 dark:hover:bg-gray-500"
                                >
                                  +
                                </button>
                              </div>
                              <div className="text-center mt-1 text-xs text-gray-600 dark:text-gray-400">
                                {(
                                  (sessionData.drawer.denominations[denom.value] || 0) * denom.value
                                ).toFixed(2)}
                                €
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Saisie globale */}
                {sessionData.drawer.method === 'custom' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Montant du fond de caisse
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={customAmount}
                        onChange={handleCustomAmountChange}
                        placeholder="0.00"
                        className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg
                                 focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                                 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-lg"
                      />
                      <Euro className="absolute right-4 top-3.5 h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                )}

                {/* Total */}
                <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-medium text-blue-900 dark:text-blue-100">
                      Fond de caisse initial :
                    </span>
                    <span className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                      {drawerTotal.toFixed(2)}€
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Étape 3: Récapitulatif */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Récapitulatif de la session
              </h4>

              <div className="space-y-4">
                {/* Configuration LCD */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h5 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center">
                    <Monitor className="h-5 w-5 mr-2" />
                    Afficheur LCD
                  </h5>
                  {sessionData.useLCD ? (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <p>
                        ✅ LCD activé sur le port : <strong>{sessionData.lcdPort}</strong>
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      ❌ Aucun LCD configuré
                    </p>
                  )}
                </div>

                {/* Fond de caisse */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h5 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center">
                    <Wallet className="h-5 w-5 mr-2" />
                    Fond de caisse
                  </h5>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <p>
                      Méthode :{' '}
                      <strong>
                        {sessionData.drawer.method === 'detailed'
                          ? 'Comptage détaillé'
                          : 'Montant global'}
                      </strong>
                    </p>
                    <p>
                      Montant initial :{' '}
                      <strong className="text-lg text-green-600 dark:text-green-400">
                        {drawerTotal.toFixed(2)}€
                      </strong>
                    </p>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Notes de session (optionnel)
                  </label>
                  <textarea
                    value={sessionData.drawer.notes}
                    onChange={(e) =>
                      setSessionData((prev) => ({
                        ...prev,
                        drawer: { ...prev.drawer, notes: e.target.value },
                      }))
                    }
                    placeholder="Remarques sur l'ouverture de session..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                             focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between p-6 border-t border-gray-200 dark:border-gray-700">
          <div>
            {currentStep > 1 && (
              <button
                onClick={() => setCurrentStep(currentStep - 1)}
                disabled={loading}
                className="flex items-center space-x-2 px-4 py-2 text-gray-700 dark:text-gray-300 
                         bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 
                         rounded-lg transition-colors disabled:opacity-50"
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
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700
                       hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors
                       disabled:opacity-50"
            >
              Annuler
            </button>

            {currentStep < 3 ? (
              <button
                onClick={() => setCurrentStep(currentStep + 1)}
                disabled={!canProceedFromStep(currentStep) || loading}
                className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg 
                         hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                <span>Suivant</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={handleConfirm}
                disabled={!canProceedFromStep(currentStep) || loading}
                className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-lg 
                         hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Démarrage...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Démarrer la journée</span>
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

export default SessionOpeningModal;
