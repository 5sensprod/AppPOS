// src/features/products/components/tabs/InventoryTab.jsx
import React from 'react';

const InventoryTab = ({ product, editable = false, register, errors, specialFields = {} }) => {
  console.log('🧰 InventoryTab - specialFields reçus:', specialFields);

  // Si en mode lecture
  if (!editable) {
    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
            Gestion des stocks
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Stock actuel</h3>
              <p
                className={`mt-1 font-medium ${
                  product.stock <= product.min_stock
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-gray-900 dark:text-gray-100'
                }`}
              >
                {product.stock !== undefined ? product.stock : '-'}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Stock minimum
              </h3>
              <p className="mt-1 text-gray-900 dark:text-gray-100">
                {product.min_stock !== undefined ? product.min_stock : 'Non défini'}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Gestion de stock
              </h3>
              <p className="mt-1 text-gray-900 dark:text-gray-100">
                {product.manage_stock ? 'Activée' : 'Désactivée'}
              </p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
            Catégories et relations
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Catégorie principale
              </h3>
              <p className="mt-1 text-gray-900 dark:text-gray-100">
                {product.category_ref ? (
                  <>
                    {product.category_ref.name}
                    {product.category_ref.hierarchy &&
                      product.category_ref.hierarchy.length > 1 && (
                        <span className="text-xs text-gray-500 ml-2">
                          ({product.category_ref.hierarchy.map((cat) => cat.name).join(' > ')})
                        </span>
                      )}
                  </>
                ) : (
                  '-'
                )}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Marque</h3>
              <p className="mt-1 text-gray-900 dark:text-gray-100">
                {product.brand_ref?.name || 'Aucune'}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Fournisseur</h3>
              <p className="mt-1 text-gray-900 dark:text-gray-100">
                {product.supplier_ref?.name || 'Aucun'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Si en mode édition
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          Gestion des stocks
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Stock actuel
            </label>
            <input
              type="number"
              {...register('stock')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
            {errors?.stock && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-500">{errors.stock.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Stock minimum
            </label>
            <input
              type="number"
              {...register('min_stock')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
            {errors?.min_stock && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-500">
                {errors.min_stock.message}
              </p>
            )}
          </div>

          <div className="flex items-center">
            <label className="inline-flex items-center mt-3">
              <input
                type="checkbox"
                {...register('manage_stock')}
                className="form-checkbox h-5 w-5 text-blue-600"
              />
              <span className="ml-2 text-gray-700 dark:text-gray-300">
                Activer la gestion de stock
              </span>
            </label>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          Catégories et relations
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Catégorie principale */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Catégorie principale
            </label>
            <select
              {...register('category_id')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="">Sélectionner une catégorie</option>
              {specialFields.category_id?.options &&
                specialFields.category_id.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
            </select>
            {errors?.category_id && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-500">
                {errors.category_id.message}
              </p>
            )}
          </div>

          {/* Catégories additionnelles */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Catégories additionnelles
            </label>
            <select
              multiple
              {...register('categories')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              size="4"
            >
              {specialFields.categories?.options &&
                specialFields.categories.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
            </select>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Maintenez Ctrl (ou Cmd) pour sélectionner plusieurs catégories
            </p>
            {errors?.categories && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-500">
                {errors.categories.message}
              </p>
            )}
          </div>

          {/* Marque */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Marque
            </label>
            <select
              {...register('brand_id')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="">Sélectionner une marque</option>
              {specialFields.brand_id?.options &&
                specialFields.brand_id.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
            </select>
            {errors?.brand_id && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-500">
                {errors.brand_id.message}
              </p>
            )}
          </div>

          {/* Fournisseur */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Fournisseur
            </label>
            <select
              {...register('supplier_id')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="">Sélectionner un fournisseur</option>
              {specialFields.supplier_id?.options &&
                specialFields.supplier_id.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
            </select>
            {errors?.supplier_id && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-500">
                {errors.supplier_id.message}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryTab;
