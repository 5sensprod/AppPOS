// src/features/pos/components/PaymentModal.jsx
import React, { useState } from 'react';
import { useCashierStore } from '../stores/cashierStore';
import ChangeCalculator from './ChangeCalculator';

const PaymentModal = () => {
  const { showPaymentModal, setShowPaymentModal, processSale, cart, loading } = useCashierStore();
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [cashPaymentData, setCashPaymentData] = useState({ amountReceived: 0, change: 0 });

  const handlePayment = async () => {
    try {
      // Pour les paiements en espèces, vérifier que le montant est suffisant
      if (paymentMethod === 'cash' && cashPaymentData.amountReceived < cart.total) {
        alert('Le montant reçu est insuffisant');
        return;
      }

      await processSale(paymentMethod, cashPaymentData);
      setShowPaymentModal(false);
    } catch (error) {
      console.error('Erreur paiement:', error);
    }
  };

  const handleCashAmountChange = (amountReceived, change) => {
    setCashPaymentData({ amountReceived, change });
  };

  if (!showPaymentModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 max-w-full">
        <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
          Paiement - {cart.total.toFixed(2)}€
        </h3>

        <div className="space-y-4 mb-6">
          <div className="space-y-3">
            <label className="flex items-center space-x-3">
              <input
                type="radio"
                value="cash"
                checked={paymentMethod === 'cash'}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="form-radio"
              />
              <span className="text-gray-700 dark:text-gray-300">Espèces</span>
            </label>

            <label className="flex items-center space-x-3">
              <input
                type="radio"
                value="card"
                checked={paymentMethod === 'card'}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="form-radio"
              />
              <span className="text-gray-700 dark:text-gray-300">Carte bancaire</span>
            </label>

            <label className="flex items-center space-x-3">
              <input
                type="radio"
                value="mixed"
                checked={paymentMethod === 'mixed'}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="form-radio"
              />
              <span className="text-gray-700 dark:text-gray-300">Mixte</span>
            </label>
          </div>

          {/* Calculateur de monnaie pour les paiements en espèces */}
          {paymentMethod === 'cash' && (
            <div className="border-t pt-4">
              <ChangeCalculator totalAmount={cart.total} onAmountChange={handleCashAmountChange} />
            </div>
          )}
        </div>

        <div className="flex space-x-3">
          <button
            onClick={() => setShowPaymentModal(false)}
            disabled={loading}
            className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 
                       rounded-lg transition-colors"
          >
            Annuler
          </button>

          <button
            onClick={handlePayment}
            disabled={
              loading || (paymentMethod === 'cash' && cashPaymentData.amountReceived < cart.total)
            }
            className="flex-1 bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 
                       rounded-lg transition-colors flex items-center justify-center
                       disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Traitement...
              </>
            ) : (
              'Valider le paiement'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
