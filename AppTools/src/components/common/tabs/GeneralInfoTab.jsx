// src/features/common/tabs/GeneralInfoTab.jsx
import React from 'react';

const GeneralInfoTab = ({ entity, fields, description, productCount, additionalSection }) => {
  // Conversion des noms de champs en libellés humains
  const fieldLabels = {
    name: 'Nom',
    sku: 'SKU',
    description: 'Description',
    status: 'Statut',
    supplier_code: 'Code fournisseur',
    customer_code: 'Code client',
    slug: 'Slug',
    parent_id: 'Catégorie parente',
  };

  // Rendu personnalisé pour certains champs
  const renderField = (field, value) => {
    if (field === 'status') {
      const statusClasses = {
        published: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        draft: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        default: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
      };
      const statusText = {
        published: 'Publié',
        draft: 'Brouillon',
        default: 'Archivé',
      };

      return (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            statusClasses[value] || statusClasses.default
          }`}
        >
          {statusText[value] || statusText.default}
        </span>
      );
    }

    if (field === 'parent_id') {
      return entity.parent_name || value || 'Aucune';
    }

    return value || '-';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          Informations générales
        </h2>

        <div className="space-y-4">
          {fields.map((field) => (
            <div key={field}>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {fieldLabels[field] || field}
              </h3>
              {field === 'description' ? (
                <p className="mt-1 text-gray-900 dark:text-gray-100 whitespace-pre-line">
                  {renderField(field, entity[field])}
                </p>
              ) : (
                <p className="mt-1 text-gray-900 dark:text-gray-100">
                  {renderField(field, entity[field])}
                </p>
              )}
            </div>
          ))}

          {productCount !== undefined && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Nombre {productCount === 1 ? "d'article" : "d'articles"}
              </h3>
              <p className="mt-1">
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  {productCount || 0}
                </span>
              </p>
            </div>
          )}
        </div>
      </div>

      {description !== undefined ? (
        <div>
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Description</h2>
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md min-h-[200px]">
            {description ? (
              <div dangerouslySetInnerHTML={{ __html: description }} />
            ) : (
              <p className="text-gray-500 dark:text-gray-400 italic">Aucune description</p>
            )}
          </div>
        </div>
      ) : additionalSection ? (
        additionalSection
      ) : null}
    </div>
  );
};

export default GeneralInfoTab;
