import React from 'react';

const StockSection = ({ product, editable, register, errors }) => {
  if (!editable) {
    return (
      <div>
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          Gestion des stocks
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Stock actuel</h3>
            <p
              className={`mt-1 font-medium ${product.stock <= product.min_stock ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}
            >
              {product.stock !== undefined ? product.stock : '-'}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Stock minimum</h3>
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
    );
  }

  return (
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
            className="w-full px-3 py-2 border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
            className="w-full px-3 py-2 border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
  );
};

export default StockSection;
