// src/features/pos/components/ReceiptModal.jsx
import React from 'react';
import { useCashierStore } from '../stores/cashierStore';

const ReceiptModal = () => {
  const { showReceiptModal, setShowReceiptModal, lastReceipt } = useCashierStore();

  if (!showReceiptModal || !lastReceipt) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 max-w-full max-h-96 overflow-y-auto">
        <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white text-center">
          Ticket de caisse
        </h3>

        <div className="text-sm space-y-2 mb-6">
          <div className="text-center border-b pb-2 mb-3">
            <p className="font-bold">MAGASIN POS</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {new Date(lastReceipt.date).toLocaleString('fr-FR')}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Transaction: {lastReceipt.transaction_id}
            </p>
          </div>

          {lastReceipt.items.map((item, index) => (
            <div key={index} className="flex justify-between">
              <div className="flex-1">
                <p className="font-medium">{item.product_name}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {item.quantity} x {item.unit_price.toFixed(2)}€
                </p>
              </div>
              <span className="font-medium">{item.total_price.toFixed(2)}€</span>
            </div>
          ))}

          <div className="border-t pt-2 mt-3">
            <div className="flex justify-between">
              <span>Sous-total</span>
              <span>{lastReceipt.subtotal.toFixed(2)}€</span>
            </div>
            <div className="flex justify-between">
              <span>TVA</span>
              <span>{lastReceipt.tax_amount.toFixed(2)}€</span>
            </div>
            <div className="flex justify-between font-bold text-lg border-t pt-1">
              <span>Total</span>
              <span>{lastReceipt.total_amount.toFixed(2)}€</span>
            </div>
          </div>

          <div className="text-center mt-3 pt-2 border-t">
            <p className="text-xs">Paiement: {lastReceipt.payment_method}</p>
            <p className="text-xs">Caissier: {lastReceipt.cashier}</p>
          </div>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={() => setShowReceiptModal(false)}
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 
                       rounded-lg transition-colors"
          >
            Fermer
          </button>

          <button
            onClick={() => window.print()}
            className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 
                       rounded-lg transition-colors"
          >
            Imprimer
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReceiptModal;
