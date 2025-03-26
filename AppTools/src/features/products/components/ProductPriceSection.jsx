// src/features/products/components/ProductPriceSection.jsx
import React from 'react';

const ProductPriceSection = ({ product, editable = false, register, errors }) => {
  // Si en mode lecture
  if (!editable) {
    return (
      <div>
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          Prix et marges
        </h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Prix de vente</h3>
            <p className="mt-1 text-gray-900 dark:text-gray-100 font-medium">
              {product.price ? `${product.price.toFixed(2)} €` : '-'}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Prix régulier</h3>
            <p className="mt-1 text-gray-900 dark:text-gray-100">
              {product.regular_price ? `${product.regular_price.toFixed(2)} €` : '-'}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Prix promo</h3>
            <p className="mt-1 text-gray-900 dark:text-gray-100">
              {product.sale_price ? `${product.sale_price.toFixed(2)} €` : '-'}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Prix d'achat</h3>
            <p className="mt-1 text-gray-900 dark:text-gray-100">
              {product.purchase_price ? `${product.purchase_price.toFixed(2)} €` : '-'}
            </p>
          </div>

          {product.margins && (
            <>
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Marge</h3>
                <p className="mt-1 text-gray-900 dark:text-gray-100">
                  {product.margins.amount ? `${product.margins.amount.toFixed(2)} €` : '-'}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Taux de marge
                </h3>
                <p className="mt-1 text-gray-900 dark:text-gray-100">
                  {product.margins.margin_rate ? `${product.margins.margin_rate.toFixed(2)}%` : '-'}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Si en mode édition
  return (
    <div>
      <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Prix et marges</h2>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Prix de vente (€)
          </label>
          <input
            type="number"
            step="0.01"
            {...register('price')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
          {errors?.price && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-500">{errors.price.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Prix régulier (€)
          </label>
          <input
            type="number"
            step="0.01"
            {...register('regular_price')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
          {errors?.regular_price && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-500">
              {errors.regular_price.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Prix promo (€)
          </label>
          <input
            type="number"
            step="0.01"
            {...register('sale_price')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
          {errors?.sale_price && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-500">
              {errors.sale_price.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Prix d'achat (€)
          </label>
          <input
            type="number"
            step="0.01"
            {...register('purchase_price')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
          {errors?.purchase_price && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-500">
              {errors.purchase_price.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductPriceSection;
