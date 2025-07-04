// src/components/common/tabs/GeneralInfoTab.jsx
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import CategorySelectField from '../fields/CategorySelectField';
import BrandSelectField from '../fields/BrandSelectField';
import imageProxyService from '../../../services/imageProxyService';
import SupplierSelectField from '../fields/SupplierSelectField';

const GeneralInfoTab = ({
  entity,
  fields = [],
  description,
  productCount,
  additionalSection,
  // Nouvelles props pour le mode édition
  editable = false,
  _specialFields = {}, // Pour passer les options des champs spéciaux comme supplier_id
}) => {
  // Récupération du contexte du formulaire si en mode édition
  const formContext = editable ? useFormContext() : null;
  // Déstructuration sécurisée pour éviter des erreurs quand formContext est null
  const register = formContext?.register;
  const errors = formContext?.formState?.errors;

  // Conversion des noms de champs en libellés humains
  const fieldLabels = {
    name: 'Nom',
    sku: 'Référence',
    designation: 'Désignation',
    description: 'Description',
    supplier_code: 'Code fournisseur',
    customer_code: 'Code client',
    slug: 'Slug',
    parent_id: 'Catégorie parente',
    supplier_id: 'Fournisseur',
    brands: 'Marques',
    suppliers: 'Fournisseurs',
  };

  // Options pour les champs de type select
  const fieldOptions = {
    supplier_id: _specialFields.supplier_id?.options || [],
  };

  // Rendu personnalisé pour certains champs en mode lecture
  const renderReadOnlyField = (field, value) => {
    if (field === 'parent_id') {
      return entity.parent_name || value || 'Aucune';
    }

    if (field === 'supplier_id') {
      // Vérifier d'abord suppliersRefs qui contient les objets fournisseurs complets
      if (entity.suppliersRefs && entity.suppliersRefs.length > 0) {
        return entity.suppliersRefs[0].name;
      }
      // Ensuite vérifier suppliers_ref (ancienne structure)
      if (entity.supplier_ref && entity.supplier_ref.name) {
        return entity.supplier_ref.name;
      }
      // Enfin vérifier le tableau suppliers et récupérer le nom correspondant
      if (entity.suppliers && entity.suppliers.length > 0) {
        // Vous devrez peut-être récupérer le nom du fournisseur à partir de l'ID
        // Cela pourrait être fait en recherchant dans les options
        const supplierId = entity.suppliers[0];
        const supplier = _specialFields.supplier_id?.options?.find((s) => s.value === supplierId);
        if (supplier) {
          return supplier.label;
        }
      }
      return 'Aucun';
    }

    if (field === 'suppliers') {
      const suppliers = entity.supplier_info?.refs || [];
      if (suppliers.length === 0) return 'Aucun';

      return (
        <div className="flex flex-wrap gap-2">
          {suppliers.map((s) => (
            <div key={s.id} className="flex items-center gap-2 border px-2 py-1 rounded">
              {s.image?.src && (
                <img
                  src={imageProxyService.getImageUrl(s.image.src)}
                  alt={s.name}
                  className="w-6 h-6 object-cover rounded"
                />
              )}
              <span>{s.name}</span>
            </div>
          ))}
        </div>
      );
    }

    if (field === 'brands') {
      const brands = entity.brandsRefs || [];
      return (
        <div className="flex flex-wrap gap-2">
          {brands.map((brand) => (
            <div key={brand.id} className="flex items-center gap-2 border px-2 py-1 rounded">
              {brand.image?.src && (
                <img
                  src={imageProxyService.getImageUrl(brand.image.src)}
                  alt={brand.name}
                  className="w-6 h-6 object-cover rounded"
                />
              )}
              <span>{brand.name}</span>
            </div>
          ))}
        </div>
      );
    }

    return value || '-';
  };

  // Rendu personnalisé pour les champs en mode édition
  const renderEditableField = (field) => {
    const error = errors && errors[field];
    const baseInputClass = `w-full px-3 py-2 border ${
      error ? 'border-red-500' : 'border-gray-300'
    } rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white`;

    // Champs avec rendu personnalisé
    if (field === 'parent_id') {
      return (
        <Controller
          name={field}
          control={formContext.control}
          render={({ field: controllerField }) => (
            <CategorySelectField
              mode="single"
              hierarchicalData={formContext.getValues('_hierarchicalCategories') || []}
              value={controllerField.value}
              onChange={controllerField.onChange}
              currentCategoryId={formContext.getValues('_id')}
              placeholder="Sélectionner une catégorie parente"
              allowRootSelection={true}
              showSearch={true}
              showCounts={true}
            />
          )}
        />
      );
    }

    switch (field) {
      case 'description':
        return (
          <textarea
            {...register(field)}
            className={`${baseInputClass} min-h-[100px]`}
            placeholder={`Entrez une description...`}
          />
        );
      case 'brands':
        return (
          <BrandSelectField
            name="brands"
            editable={editable}
            options={_specialFields.brands?.options || []}
          />
        );
      case 'suppliers':
        return (
          <SupplierSelectField
            name="suppliers"
            editable={editable}
            options={_specialFields.suppliers?.options || []}
          />
        );
      case 'supplier_id':
        return (
          <select {...register(field)} className={baseInputClass}>
            <option value="">Sélectionner un fournisseur</option>
            {fieldOptions.supplier_id && fieldOptions.supplier_id.length > 0 ? (
              fieldOptions.supplier_id.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))
            ) : (
              <option disabled>Chargement des fournisseurs...</option>
            )}
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
                    <div className="mt-1 text-gray-900 dark:text-gray-100 whitespace-pre-line">
                      {renderReadOnlyField(field, entity[field])}
                    </div>
                  ) : (
                    <div className="mt-1 text-gray-900 dark:text-gray-100">
                      {renderReadOnlyField(field, entity[field])}
                    </div>
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
