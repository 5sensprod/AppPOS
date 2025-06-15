// src/features/pos/components/ChangeCalculator.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Calculator, Euro } from 'lucide-react';

// Dénominations en euros (billets et pièces) - déplacées en dehors du composant
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

const ChangeCalculator = ({ totalAmount, onAmountChange }) => {
  const [amountReceived, setAmountReceived] = useState('');
  const [changeAmount, setChangeAmount] = useState(0);
  const [denomination, setDenomination] = useState([]);

  // Boutons de montants rapides
  const quickAmounts = [5, 10, 20, 50, 100];

  // Calculer la décomposition de la monnaie - mémorisée pour éviter les re-créations
  const calculateDenomination = useCallback((amount) => {
    const result = [];
    let remaining = Math.round(amount * 100) / 100; // Arrondir pour éviter les problèmes de précision

    for (const denom of denominations) {
      if (remaining >= denom.value) {
        const count = Math.floor(remaining / denom.value);
        if (count > 0) {
          result.push({
            ...denom,
            count,
          });
          remaining = Math.round((remaining - count * denom.value) * 100) / 100;
        }
      }
    }

    return result;
  }, []);

  // Effet pour calculer la monnaie
  useEffect(() => {
    const received = parseFloat(amountReceived) || 0;
    const change = received - totalAmount;

    if (change >= 0) {
      setChangeAmount(change);
      setDenomination(calculateDenomination(change));
      onAmountChange?.(received, change);
    } else {
      setChangeAmount(0);
      setDenomination([]);
      onAmountChange?.(received, 0);
    }
  }, [amountReceived, totalAmount, calculateDenomination]); // Ajouter calculateDenomination qui est maintenant stable

  const handleAmountChange = (e) => {
    const value = e.target.value;
    // Permettre seulement les nombres et les décimales
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setAmountReceived(value);
    }
  };

  const addQuickAmount = (amount) => {
    const currentAmount = parseFloat(amountReceived) || 0;
    setAmountReceived((currentAmount + amount).toString());
  };

  const clearAmount = () => {
    setAmountReceived('');
  };

  const isValidPayment = parseFloat(amountReceived) >= totalAmount;

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
        <Calculator className="h-5 w-5" />
        <h4 className="font-medium">Calcul de la monnaie</h4>
      </div>

      {/* Montant total */}
      <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 dark:text-gray-400">Total à payer :</span>
          <span className="font-bold text-lg text-gray-900 dark:text-white">
            {totalAmount.toFixed(2)}€
          </span>
        </div>
      </div>

      {/* Saisie du montant reçu */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Montant reçu :
        </label>
        <div className="relative">
          <input
            type="text"
            value={amountReceived}
            onChange={handleAmountChange}
            placeholder="0.00"
            className="w-full px-3 py-2 pr-8 border border-gray-300 dark:border-gray-600 
                       rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <Euro className="absolute right-2 top-2.5 h-5 w-5 text-gray-400" />
        </div>
      </div>

      {/* Boutons montants rapides */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Montants rapides :
        </label>
        <div className="flex flex-wrap gap-2">
          {quickAmounts.map((amount) => (
            <button
              key={amount}
              onClick={() => addQuickAmount(amount)}
              className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300
                         hover:bg-blue-200 dark:hover:bg-blue-800 rounded-lg transition-colors"
            >
              +{amount}€
            </button>
          ))}
          <button
            onClick={clearAmount}
            className="px-3 py-1 text-sm bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300
                       hover:bg-red-200 dark:hover:bg-red-800 rounded-lg transition-colors"
          >
            Effacer
          </button>
        </div>
      </div>

      {/* Affichage de la monnaie */}
      {amountReceived && (
        <div
          className={`p-3 rounded-lg border-2 ${
            isValidPayment
              ? 'bg-green-50 dark:bg-green-900 border-green-200 dark:border-green-700'
              : 'bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-700'
          }`}
        >
          {isValidPayment ? (
            <>
              <div className="flex justify-between items-center mb-3">
                <span className="font-medium text-green-700 dark:text-green-300">
                  Monnaie à rendre :
                </span>
                <span className="font-bold text-xl text-green-800 dark:text-green-200">
                  {changeAmount.toFixed(2)}€
                </span>
              </div>

              {/* Décomposition en billets et pièces */}
              {denomination.length > 0 && changeAmount > 0 && (
                <div className="space-y-2">
                  <h5 className="text-sm font-medium text-green-700 dark:text-green-300">
                    Décomposition :
                  </h5>
                  <div className="grid grid-cols-2 gap-1 text-sm">
                    {denomination.map((denom, index) => (
                      <div key={index} className="flex justify-between">
                        <span className="text-green-600 dark:text-green-400">
                          {denom.count}x {denom.label}
                        </span>
                        <span className="text-green-700 dark:text-green-300">
                          {(denom.count * denom.value).toFixed(2)}€
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {changeAmount === 0 && (
                <p className="text-sm text-green-600 dark:text-green-400 text-center">
                  💰 Montant exact - Pas de monnaie à rendre
                </p>
              )}
            </>
          ) : (
            <div className="text-center">
              <p className="text-red-700 dark:text-red-300 font-medium">⚠️ Montant insuffisant</p>
              <p className="text-sm text-red-600 dark:text-red-400">
                Il manque {(totalAmount - parseFloat(amountReceived || 0)).toFixed(2)}€
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ChangeCalculator;
