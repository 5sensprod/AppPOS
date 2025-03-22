// src/features/products/components/ProductPriceSection.jsx
import React from 'react';

const ProductPriceSection = ({ product }) => {
  return (
    <div>
      <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Prix et marges</h2>

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
};

export default ProductPriceSection;
