// src/features/pos/components/ReceiptModal.jsx
import React from 'react';
import { Receipt, Printer, Percent } from 'lucide-react';
import BaseModal from '../../../components/common/ui/BaseModal';
import { useCashierStore } from '../stores/cashierStore';

const ReceiptModal = () => {
  const { showReceiptModal, setShowReceiptModal, lastReceipt } = useCashierStore();

  if (!showReceiptModal || !lastReceipt) return null;

  // Vérifier s'il y a des réductions
  const hasDiscounts = lastReceipt.discounts && lastReceipt.discounts.total > 0;
  const hasSavings = lastReceipt.savings_summary;

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
            <div key={index} className="space-y-1">
              {/* Ligne principale de l'article */}
              <div className="flex justify-between items-start">
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

              {/* Réduction item si présente */}
              {item.discount_amount && item.discount_amount > 0 && (
                <div className="flex justify-between items-center ml-4 text-xs">
                  <div className="flex items-center space-x-1 text-red-600 dark:text-red-400">
                    <Percent className="h-3 w-3" />
                    <span>
                      {item.discount?.type === 'percentage'
                        ? `Réduction ${item.discount.value}%`
                        : 'Réduction fixe'}
                    </span>
                    {item.discount?.reason && (
                      <span className="text-gray-500 dark:text-gray-400">
                        ({item.discount.reason})
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-red-600 dark:text-red-400">
                    -{item.discount_amount.toFixed(2)}€
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Totaux */}
        <div className="border-t border-gray-200 dark:border-gray-600 pt-3 mt-4 space-y-2">
          {/* Sous-total avant réductions (si réductions présentes) */}
          {hasDiscounts && hasSavings && (
            <div className="flex justify-between text-gray-600 dark:text-gray-400">
              <span>Sous-total initial</span>
              <span className="font-mono">{hasSavings.original_total.toFixed(2)}€</span>
            </div>
          )}

          {/* Réductions détaillées */}
          {hasDiscounts && (
            <div className="space-y-1">
              {/* Réductions articles */}
              {lastReceipt.discounts.items_total > 0 && (
                <div className="flex justify-between text-red-600 dark:text-red-400">
                  <span className="flex items-center space-x-1">
                    <Percent className="h-3 w-3" />
                    <span>Réductions articles</span>
                  </span>
                  <span className="font-mono">
                    -{lastReceipt.discounts.items_total.toFixed(2)}€
                  </span>
                </div>
              )}

              {/* Réduction ticket globale */}
              {lastReceipt.discounts.ticket && lastReceipt.discounts.ticket.amount > 0 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-red-600 dark:text-red-400">
                    <span className="flex items-center space-x-1">
                      <Percent className="h-3 w-3" />
                      <span>Réduction globale</span>
                    </span>
                    <span className="font-mono">
                      -{lastReceipt.discounts.ticket.amount.toFixed(2)}€
                    </span>
                  </div>
                  {lastReceipt.discounts.ticket.reason && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 text-right">
                      Motif: {lastReceipt.discounts.ticket.reason}
                    </div>
                  )}
                </div>
              )}

              {/* Total des réductions */}
              <div className="flex justify-between font-medium text-red-600 dark:text-red-400 border-t border-red-200 dark:border-red-800 pt-1">
                <span>Total réductions</span>
                <span className="font-mono">-{lastReceipt.discounts.total.toFixed(2)}€</span>
              </div>
            </div>
          )}

          {/* Sous-total après réductions articles */}
          <div className="flex justify-between text-gray-700 dark:text-gray-300">
            <span>Sous-total</span>
            <span className="font-mono">{lastReceipt.subtotal.toFixed(2)}€</span>
          </div>

          {/* TVA */}
          <div className="flex justify-between text-gray-700 dark:text-gray-300">
            <span>TVA</span>
            <span className="font-mono">{lastReceipt.tax_amount.toFixed(2)}€</span>
          </div>

          {/* Total final */}
          <div className="flex justify-between font-bold text-lg border-t border-gray-200 dark:border-gray-600 pt-2 text-gray-900 dark:text-gray-100">
            <span>Total</span>
            <span className="font-mono">{lastReceipt.total_amount.toFixed(2)}€</span>
          </div>
        </div>

        {/* Résumé des économies (encadré vert) */}
        {hasSavings && hasSavings.total_saved > 0 && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 mt-4">
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 text-green-700 dark:text-green-300 font-medium">
                <Percent className="h-4 w-4" />
                <span>Vous avez économisé</span>
              </div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                {hasSavings.total_saved.toFixed(2)}€
              </div>
              <div className="text-sm text-green-600 dark:text-green-400 mt-1">
                {hasSavings.savings_percentage.toFixed(1)}% d'économies
              </div>
            </div>
          </div>
        )}

        {/* Informations de paiement */}
        <div className="text-center mt-4 pt-3 border-t border-gray-200 dark:border-gray-600 space-y-1">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            <span className="font-medium">Paiement:</span>{' '}
            {lastReceipt.payment_method === 'cash'
              ? 'Espèces'
              : lastReceipt.payment_method === 'card'
                ? 'Carte bancaire'
                : lastReceipt.payment_method === 'mixed'
                  ? 'Paiement mixte'
                  : lastReceipt.payment_method}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            <span className="font-medium">Caissier:</span> {lastReceipt.cashier}
          </p>
        </div>

        {/* Message de remerciement */}
        <div className="text-center text-xs text-gray-500 dark:text-gray-400 mt-4 pt-2 border-t border-gray-200 dark:border-gray-600">
          <p>Merci de votre visite !</p>
          <p>À bientôt</p>
          {hasSavings && (
            <p className="text-green-600 dark:text-green-400 font-medium mt-1">
              💰 Merci de votre fidélité !
            </p>
          )}
        </div>
      </div>
    </BaseModal>
  );
};

export default ReceiptModal;
