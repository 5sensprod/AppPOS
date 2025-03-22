// src/features/common/tabs/PaymentInfoTab.jsx
import React from 'react';
import { CreditCard, Calendar } from 'lucide-react';

const PaymentInfoTab = ({ banking, paymentTerms }) => {
  // Fonction pour convertir les types de paiement
  const getPaymentTermText = (type) => {
    const terms = {
      immediate: 'Immédiat',
      '30days': '30 jours',
      '60days': '60 jours',
      '90days': '90 jours',
    };

    return terms[type] || type;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          Informations de paiement
        </h2>

        {banking || paymentTerms ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {banking && (
              <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-sm">
                <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                  <CreditCard className="h-5 w-5 mr-2" /> Informations bancaires
                </h3>

                <div className="space-y-3">
                  {banking.iban && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">IBAN</h4>
                      <p className="mt-1 text-gray-900 dark:text-gray-100 font-mono">
                        {banking.iban}
                      </p>
                    </div>
                  )}

                  {banking.bic && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        BIC/SWIFT
                      </h4>
                      <p className="mt-1 text-gray-900 dark:text-gray-100 font-mono">
                        {banking.bic}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {paymentTerms && (
              <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-sm">
                <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                  <Calendar className="h-5 w-5 mr-2" /> Conditions de paiement
                </h3>

                <div className="space-y-3">
                  {paymentTerms.type && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Délai de paiement
                      </h4>
                      <p className="mt-1 text-gray-900 dark:text-gray-100">
                        {getPaymentTermText(paymentTerms.type)}
                      </p>
                    </div>
                  )}

                  {paymentTerms.discount !== undefined && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Remise
                      </h4>
                      <p className="mt-1 text-gray-900 dark:text-gray-100">
                        {paymentTerms.discount}%
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">
            Aucune information de paiement disponible
          </p>
        )}
      </div>
    </div>
  );
};

export default PaymentInfoTab;
