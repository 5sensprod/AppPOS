// src/features/products/components/tabs/InventoryTab.jsx
import React from 'react';
import { useFormContext } from 'react-hook-form';
import CategoriesSection from '../sections/CategoriesSection';
import BrandsSuppliersSection from '../sections/BrandsSuppliersSection';

const InventoryTab = ({ product, editable, errors, specialFields }) => {
  // ✅ Utiliser useFormContext pour les champs additionnels
  const { register } = useFormContext() || {};

  return (
    <div className="space-y-8">
      {/* ✅ Section Catégories */}
      <CategoriesSection
        product={product}
        editable={editable}
        errors={errors}
        specialFields={specialFields}
      />

      {/* ✅ Section Marques et Fournisseurs unifiée */}
      <div className="border-t border-gray-200 dark:border-gray-600 pt-8">
        <BrandsSuppliersSection
          product={product}
          editable={editable}
          errors={errors}
          specialFields={specialFields}
        />
      </div>

      {/* ✅ Section Résumé (mode lecture uniquement) */}
      {!editable && (
        <div className="border-t border-gray-200 dark:border-gray-600 pt-8">
          <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
              Résumé de l'organisation
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Catégorisation */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Catégorisation
                </h4>
                <div className="space-y-2">
                  {product.categories?.length > 0 ? (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {product.categories.length} catégorie
                      {product.categories.length > 1 ? 's' : ''}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 italic">Non catégorisé</div>
                  )}
                </div>
              </div>

              {/* Approvisionnement */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Approvisionnement
                </h4>
                <div className="space-y-2">
                  {product.supplier_ref?.name ? (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {product.supplier_ref.name}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 italic">Aucun fournisseur</div>
                  )}
                </div>
              </div>

              {/* Marque */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Marque
                </h4>
                <div className="space-y-2">
                  {product.brand_ref?.name ? (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {product.brand_ref.name}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 italic">Marque distributeur</div>
                  )}
                </div>
              </div>
            </div>

            {/* Indicateurs de complétude */}
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Complétude des informations
              </h4>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Catégorisé', condition: product.categories?.length > 0 },
                  { label: 'Fournisseur', condition: !!product.supplier_ref?.name },
                  { label: 'Marque', condition: !!product.brand_ref?.name },
                  { label: 'Stock géré', condition: !!product.manage_stock },
                  {
                    label: 'Code barres',
                    condition: !!product.meta_data?.find((m) => m.key === 'barcode')?.value,
                  },
                ].map((item) => (
                  <span
                    key={item.label}
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      item.condition
                        ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                        : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                    }`}
                  >
                    {item.condition ? '✓' : '✗'} {item.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryTab;
