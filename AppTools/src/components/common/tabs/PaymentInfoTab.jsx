// src/features/common/tabs/PaymentInfoTab.jsx
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { CreditCard, Calendar } from 'lucide-react';

const PaymentInfoTab = ({
  banking,
  paymentTerms,
  // Nouvelles props pour le mode édition
  editable = false,
}) => {
  // Récupération du contexte du formulaire si en mode édition
  const formContext = editable ? useFormContext() : null;
  // Destructuration sécurisée pour éviter l'erreur
  const register = formContext?.register;
  const errors = formContext?.formState?.errors;

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

  // Les options pour le select des conditions de paiement
  const paymentTermOptions = [
    { value: 'immediate', label: 'Immédiat' },
    { value: '30days', label: '30 jours' },
    { value: '60days', label: '60 jours' },
    { value: '90days', label: '90 jours' },
  ];

  // Classe de base pour les champs de formulaire
  const getInputClass = (fieldPath) => {
    const path = fieldPath.split('.');
    let error = errors;

    // Parcourir le chemin d'erreur
    for (const part of path) {
      if (!error) break;
      error = error[part];
    }

    return `w-full px-3 py-2 border ${
      error ? 'border-red-500' : 'border-gray-300'
    } rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          Informations de paiement
        </h2>

        {editable ? (
          // Mode édition
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-sm">
              <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                <CreditCard className="h-5 w-5 mr-2" /> Informations bancaires
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    IBAN
                  </label>
                  <input
                    type="text"
                    {...register('banking.iban')}
                    className={getInputClass('banking.iban')}
                    placeholder="IBAN"
                  />
                  {errors?.banking?.iban && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-500">
                      {errors.banking.iban.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    BIC/SWIFT
                  </label>
                  <input
                    type="text"
                    {...register('banking.bic')}
                    className={getInputClass('banking.bic')}
                    placeholder="BIC/SWIFT"
                  />
                  {errors?.banking?.bic && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-500">
                      {errors.banking.bic.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-sm">
              <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                <Calendar className="h-5 w-5 mr-2" /> Conditions de paiement
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Délai de paiement
                  </label>
                  <select
                    {...register('payment_terms.type')}
                    className={getInputClass('payment_terms.type')}
                  >
                    {paymentTermOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {errors?.payment_terms?.type && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-500">
                      {errors.payment_terms.type.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Remise (%)
                  </label>
                  <input
                    type="number"
                    {...register('payment_terms.discount')}
                    className={getInputClass('payment_terms.discount')}
                    placeholder="Remise en pourcentage"
                    min="0"
                    max="100"
                    step="0.01"
                  />
                  {errors?.payment_terms?.discount && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-500">
                      {errors.payment_terms.discount.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Mode lecture
          <div>
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
                          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            IBAN
                          </h4>
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
        )}
      </div>
    </div>
  );
};

export default PaymentInfoTab;
