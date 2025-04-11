// src/features/common/tabs/WooCommerceTab.jsx
import React from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { useFormContext } from 'react-hook-form';

const WooCommerceTab = ({ entity, entityType, onSync, editable = false, showStatus = false }) => {
  // Récupération du contexte du formulaire si en mode édition
  const formContext = editable ? useFormContext() : null;
  const register = formContext?.register;
  const errors = formContext?.formState?.errors;

  // Options pour le champ statut
  const statusOptions = [
    { value: 'published', label: 'Publié' },
    { value: 'draft', label: 'Brouillon' },
    { value: 'archived', label: 'Archivé' },
  ];

  // Fonction pour obtenir le texte approprié selon le type d'entité
  const getEntityTypeText = () => {
    const types = {
      product: 'Produit',
      category: 'Catégorie',
      brand: 'Marque',
      supplier: 'Fournisseur',
    };

    return types[entityType] || 'Élément';
  };

  // Déterminer si on doit afficher le statut selon le type d'entité
  // Par défaut, on affiche uniquement pour les produits, sauf si showStatus est explicitement à true
  const shouldShowStatus = showStatus || entityType === 'product';

  // Rendu du statut en mode lecture seule
  const renderStatusField = (status) => {
    const statusClasses = {
      published: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      draft: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      archived: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
      default: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    };
    const statusText = {
      published: 'Publié',
      draft: 'Brouillon',
      archived: 'Archivé',
      default: 'Inconnu',
    };

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${
          statusClasses[status] || statusClasses.default
        }`}
      >
        {statusText[status] || statusText.default}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Section du statut de publication - conditionnel */}
      {shouldShowStatus && (
        <div>
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
            Statut de publication
          </h2>

          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Statut</h3>

            {editable ? (
              <div>
                <select
                  {...register('status')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {errors && errors.status && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-500">
                    {errors.status.message}
                  </p>
                )}
              </div>
            ) : (
              <div className="mt-1 text-gray-900 dark:text-gray-100">
                {renderStatusField(entity.status)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Section du statut de synchronisation */}
      <div>
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          Statut de synchronisation
        </h2>

        {entity.woo_id ? (
          <div className="bg-green-50 dark:bg-green-900 p-4 rounded-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-5 w-5 text-green-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800 dark:text-green-200">
                  {getEntityTypeText()} synchronisé(e) avec la boutique en ligne
                </h3>
                <div className="mt-2 text-sm text-green-700 dark:text-green-300">
                  <p>ID Internet : {entity.woo_id}</p>
                  {entity.website_url && (
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Url :{' '}
                      <a
                        href={entity.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 duration-200 ease-in-out"
                      >
                        {entity.website_url}
                      </a>
                    </p>
                  )}
                  {entity.last_sync && (
                    <p>Dernière synchronisation : {new Date(entity.last_sync).toLocaleString()}</p>
                  )}
                  {entity.pending_sync && (
                    <div className="mt-2">
                      <p className="text-yellow-600 dark:text-yellow-300">
                        Des modifications locales sont en attente de synchronisation
                      </p>
                      {onSync && (
                        <button
                          onClick={() => onSync(entity.id)}
                          className="mt-2 px-3 py-1 text-xs font-medium rounded-md bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-800 dark:text-blue-100 dark:hover:bg-blue-700"
                        >
                          Synchroniser les modifications
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 dark:bg-yellow-900 p-4 rounded-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  {getEntityTypeText()} non synchronisé(e)
                </h3>
                <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                  <p>Cet élément n'a pas encore été synchronisé avec WooCommerce.</p>
                  {onSync && (
                    <button
                      onClick={() => onSync(entity.id)}
                      className="mt-2 px-3 py-1 text-xs font-medium rounded-md bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-800 dark:text-yellow-100 dark:hover:bg-yellow-700"
                    >
                      Synchroniser maintenant
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {entity.website && (
        <div className="mt-4">
          <a
            href={entity.website}
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
          >
            Voir l'élément sur la boutique en ligne
          </a>
        </div>
      )}
    </div>
  );
};

export default WooCommerceTab;
