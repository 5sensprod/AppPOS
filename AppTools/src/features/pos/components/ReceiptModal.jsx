// src/features/pos/components/ReceiptModal.jsx
import React from 'react';
import { Receipt, Printer } from 'lucide-react';
import BaseModal from '../../../components/common/ui/BaseModal';
import { useCashierStore } from '../stores/cashierStore';

const ReceiptModal = () => {
  const { showReceiptModal, setShowReceiptModal, lastReceipt } = useCashierStore();

  if (!showReceiptModal || !lastReceipt) return null;

  // Footer avec les boutons d'action
  const footer = (
    <>
      <button
        onClick={() => setShowReceiptModal(false)}
        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
      >
        Fermer
      </button>
      <button
        onClick={() => window.print()}
        className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
      >
        <Printer className="h-4 w-4" />
        <span>Imprimer</span>
      </button>
    </>
  );

  return (
    <BaseModal
      isOpen={showReceiptModal}
      onClose={() => setShowReceiptModal(false)}
      title="Ticket de caisse"
      icon={Receipt}
      footer={footer}
      maxWidth="max-w-md"
    >
      <div className="text-sm space-y-4">
        {/* En-tête du ticket */}
        <div className="text-center border-b border-gray-200 dark:border-gray-600 pb-3 mb-4">
          <p className="font-bold text-lg text-gray-900 dark:text-gray-100">MAGASIN POS</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {new Date(lastReceipt.date).toLocaleString('fr-FR')}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Transaction: <span className="font-mono">{lastReceipt.transaction_id}</span>
          </p>
        </div>

        {/* Articles */}
        <div className="space-y-3">
          {lastReceipt.items.map((item, index) => (
            <div key={index} className="flex justify-between items-start">
              <div className="flex-1 pr-2">
                <p className="font-medium text-gray-900 dark:text-gray-100 leading-tight">
                  {item.product_name}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  <span className="font-mono">{item.quantity}</span> ×{' '}
                  <span className="font-mono">{item.unit_price.toFixed(2)}€</span>
                </p>
              </div>
              <span className="font-medium text-gray-900 dark:text-gray-100 font-mono">
                {item.total_price.toFixed(2)}€
              </span>
            </div>
          ))}
        </div>

        {/* Totaux */}
        <div className="border-t border-gray-200 dark:border-gray-600 pt-3 mt-4 space-y-2">
          <div className="flex justify-between text-gray-700 dark:text-gray-300">
            <span>Sous-total</span>
            <span className="font-mono">{lastReceipt.subtotal.toFixed(2)}€</span>
          </div>
          <div className="flex justify-between text-gray-700 dark:text-gray-300">
            <span>TVA</span>
            <span className="font-mono">{lastReceipt.tax_amount.toFixed(2)}€</span>
          </div>
          <div className="flex justify-between font-bold text-lg border-t border-gray-200 dark:border-gray-600 pt-2 text-gray-900 dark:text-gray-100">
            <span>Total</span>
            <span className="font-mono">{lastReceipt.total_amount.toFixed(2)}€</span>
          </div>
        </div>

        {/* Informations de paiement */}
        <div className="text-center mt-4 pt-3 border-t border-gray-200 dark:border-gray-600 space-y-1">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            <span className="font-medium">Paiement:</span> {lastReceipt.payment_method}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            <span className="font-medium">Caissier:</span> {lastReceipt.cashier}
          </p>
        </div>

        {/* Message de remerciement */}
        <div className="text-center text-xs text-gray-500 dark:text-gray-400 mt-4 pt-2 border-t border-gray-200 dark:border-gray-600">
          <p>Merci de votre visite !</p>
          <p>À bientôt</p>
        </div>
      </div>
    </BaseModal>
  );
};

export default ReceiptModal;
