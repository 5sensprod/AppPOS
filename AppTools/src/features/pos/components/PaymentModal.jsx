// src/features/pos/components/PaymentModal.jsx
import React, { useState } from 'react';
import { CreditCard, Banknote, Check } from 'lucide-react';
import BaseModal from '../../../components/common/ui/BaseModal';
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

      // ✅ NOUVEAU : Préparer les données selon le type de paiement
      let paymentData = { payment_method: paymentMethod };

      if (paymentMethod === 'cash') {
        paymentData.cash_payment_data = {
          amount_received: cashPaymentData.amountReceived,
          change: cashPaymentData.change,
          exact_amount: cashPaymentData.change === 0,
        };
      }

      // TODO: Ajouter support paiement mixte
      // if (paymentMethod === 'mixed') {
      //   paymentData.mixed_payment_data = {
      //     cash_amount: mixedPaymentData.cashAmount,
      //     card_amount: mixedPaymentData.cardAmount,
      //   };
      // }

      console.log('💳 [PAYMENT] Données envoyées:', paymentData);

      // ✅ MODIFIER : Passer les données complètes au lieu du seul payment_method
      await processSale(paymentData);
      setShowPaymentModal(false);

      // ✅ NOUVEAU : Reset des données après paiement réussi
      setCashPaymentData({ amountReceived: 0, change: 0 });
    } catch (error) {
      console.error('Erreur paiement:', error);
      // Afficher une meilleure erreur à l'utilisateur
      alert('Erreur lors du paiement: ' + (error.message || 'Erreur inconnue'));
    }
  };

  const handlePaymentMethodChange = (method) => {
    setPaymentMethod(method);
    setCashPaymentData({ amountReceived: 0, change: 0 });
  };

  const handleCashAmountChange = (amountReceived, change) => {
    setCashPaymentData({ amountReceived, change });
  };

  const handleClose = () => {
    setShowPaymentModal(false);
    // Reset des données à la fermeture
    setCashPaymentData({ amountReceived: 0, change: 0 });
    setPaymentMethod('cash');
  };

  if (!showPaymentModal) return null;

  // Titre avec montant
  const modalTitle = `Paiement - ${cart.total.toFixed(2)}€`;

  // Footer avec les boutons d'action
  const footer = (
    <>
      <button
        onClick={handleClose}
        disabled={loading}
        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors disabled:opacity-50"
      >
        Annuler
      </button>
      <button
        onClick={handlePayment}
        disabled={
          loading || (paymentMethod === 'cash' && cashPaymentData.amountReceived < cart.total)
        }
        className="flex items-center space-x-2 px-6 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span>Traitement...</span>
          </>
        ) : (
          <>
            <Check className="h-4 w-4" />
            <span>Valider le paiement</span>
          </>
        )}
      </button>
    </>
  );

  // Icônes pour les méthodes de paiement
  const getPaymentIcon = (method) => {
    switch (method) {
      case 'cash':
        return <Banknote className="h-4 w-4" />;
      case 'card':
        return <CreditCard className="h-4 w-4" />;
      case 'mixed':
        return <CreditCard className="h-4 w-4" />;
      default:
        return <CreditCard className="h-4 w-4" />;
    }
  };

  return (
    <BaseModal
      isOpen={showPaymentModal}
      onClose={handleClose}
      title={modalTitle}
      icon={CreditCard}
      footer={footer}
      maxWidth="max-w-md"
    >
      <div className="space-y-6">
        {/* Méthodes de paiement */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Choisir la méthode de paiement
          </h4>
          <div className="space-y-3">
            <label className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors">
              <input
                type="radio"
                value="cash"
                checked={paymentMethod === 'cash'}
                onChange={(e) => handlePaymentMethodChange(e.target.value)}
                className="text-blue-600 focus:ring-blue-500"
              />
              <Banknote className="h-5 w-5 text-green-600" />
              <span className="text-gray-700 dark:text-gray-300 font-medium">Espèces</span>
            </label>

            <label className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors">
              <input
                type="radio"
                value="card"
                checked={paymentMethod === 'card'}
                onChange={(e) => handlePaymentMethodChange(e.target.value)}
                className="text-blue-600 focus:ring-blue-500"
              />
              <CreditCard className="h-5 w-5 text-blue-600" />
              <span className="text-gray-700 dark:text-gray-300 font-medium">Carte bancaire</span>
            </label>

            <label className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors">
              <input
                type="radio"
                value="mixed"
                checked={paymentMethod === 'mixed'}
                onChange={(e) => handlePaymentMethodChange(e.target.value)}
                className="text-blue-600 focus:ring-blue-500"
              />
              <div className="flex items-center space-x-1">
                <Banknote className="h-4 w-4 text-green-600" />
                <CreditCard className="h-4 w-4 text-blue-600" />
              </div>
              <span className="text-gray-700 dark:text-gray-300 font-medium">Paiement mixte</span>
            </label>
          </div>
        </div>

        {/* Calculateur de monnaie pour les paiements en espèces */}
        {paymentMethod === 'cash' && (
          <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Calcul de la monnaie
            </h4>
            <ChangeCalculator totalAmount={cart.total} onAmountChange={handleCashAmountChange} />
          </div>
        )}

        {/* Information pour carte bancaire */}
        {paymentMethod === 'card' && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center space-x-2 text-blue-800 dark:text-blue-200">
              <CreditCard className="h-5 w-5" />
              <span className="text-sm font-medium">Paiement par carte</span>
            </div>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
              Montant exact: {cart.total.toFixed(2)}€
            </p>
          </div>
        )}

        {/* Information pour paiement mixte */}
        {paymentMethod === 'mixed' && (
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
            <div className="flex items-center space-x-2 text-orange-800 dark:text-orange-200">
              <div className="flex items-center space-x-1">
                <Banknote className="h-4 w-4" />
                <CreditCard className="h-4 w-4" />
              </div>
              <span className="text-sm font-medium">Paiement mixte</span>
            </div>
            <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
              Fonctionnalité en cours de développement
            </p>
          </div>
        )}

        {/* Résumé du montant */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Montant à encaisser :
            </span>
            <span className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {cart.total.toFixed(2)}€
            </span>
          </div>
          {paymentMethod === 'cash' && cashPaymentData.amountReceived > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Montant reçu :</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {cashPaymentData.amountReceived.toFixed(2)}€
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Monnaie à rendre :</span>
                <span
                  className={`font-medium ${
                    cashPaymentData.change >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {cashPaymentData.change.toFixed(2)}€
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </BaseModal>
  );
};

export default PaymentModal;
