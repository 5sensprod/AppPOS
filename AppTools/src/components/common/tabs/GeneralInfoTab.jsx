// src/features/common/tabs/GeneralInfoTab.jsx
import React from 'react';
import { useFormContext } from 'react-hook-form';

const GeneralInfoTab = ({
  entity,
  fields,
  description,
  productCount,
  additionalSection,
  // Nouvelles props pour le mode édition
  editable = false,
}) => {
  // Récupération du contexte du formulaire si en mode édition
  const formContext = editable ? useFormContext() : null;
  // Déstructuration sécurisée pour éviter des erreurs quand formContext est null
  const register = formContext?.register;
  const errors = formContext?.formState?.errors;

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

  // Options pour les champs de type select
  const fieldOptions = {
    status: [
      { value: 'published', label: 'Publié' },
      { value: 'draft', label: 'Brouillon' },
      { value: 'archived', label: 'Archivé' },
    ],
  };

  // Rendu personnalisé pour certains champs en mode lecture
  const renderReadOnlyField = (field, value) => {
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

  // Rendu personnalisé pour les champs en mode édition
  const renderEditableField = (field) => {
    const error = errors && errors[field];
    const baseInputClass = `w-full px-3 py-2 border ${
      error ? 'border-red-500' : 'border-gray-300'
    } rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white`;

    switch (field) {
      case 'description':
        return (
          <textarea
            {...register(field)}
            className={`${baseInputClass} min-h-[100px]`}
            placeholder={`Entrez une description...`}
          />
        );
      case 'status':
        return (
          <select {...register(field)} className={baseInputClass}>
            {fieldOptions.status.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      default:
        return (
          <input
            type="text"
            {...(register ? register(field) : {})}
            className={baseInputClass}
            placeholder={`Entrez ${fieldLabels[field] ? `le ${fieldLabels[field].toLowerCase()}` : field}...`}
          />
        );
    }
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
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                {fieldLabels[field] || field}
              </h3>

              {editable ? (
                // Mode édition
                <div>
                  {renderEditableField(field)}
                  {errors && errors[field] && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-500">
                      {errors[field].message}
                    </p>
                  )}
                </div>
              ) : (
                // Mode lecture
                <div>
                  {field === 'description' ? (
                    <p className="mt-1 text-gray-900 dark:text-gray-100 whitespace-pre-line">
                      {renderReadOnlyField(field, entity[field])}
                    </p>
                  ) : (
                    <p className="mt-1 text-gray-900 dark:text-gray-100">
                      {renderReadOnlyField(field, entity[field])}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}

          {productCount !== undefined && !editable && (
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

      {description !== undefined && !editable ? (
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
      ) : editable && description !== undefined ? (
        <div>
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Description</h2>
          <div className="p-4 rounded-md min-h-[200px]">
            <textarea
              {...register('description')}
              className="w-full h-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Entrez une description détaillée..."
              rows={8}
            />
            {errors && errors.description && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-500">
                {errors.description.message}
              </p>
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
