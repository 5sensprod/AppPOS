// src/features/products/components/tabs/InventoryTab.jsx
import React from 'react';
import { useFormContext } from 'react-hook-form';
import StockSection from '../sections/StockSection';
import BarcodeSection from '../sections/BarcodeSection';
import CategoriesSection from '../sections/CategoriesSection';
import BrandsSuppliersSection from '../sections/BrandsSuppliersSection';

const InventoryTab = ({ product, editable, errors, specialFields }) => {
  // ✅ Utiliser useFormContext pour les sections qui en ont besoin
  const formContext = useFormContext();
  const { register, control, setValue, watch } = formContext || {};

  return (
    <div className="space-y-8">
      {/* ✅ Section Gestion des stocks - Atomisée */}
      <StockSection product={product} editable={editable} />

      {/* ✅ Section Codes d'identification */}
      <div className="border-t border-gray-200 dark:border-gray-600 pt-8">
        <BarcodeSection
          product={product}
          editable={editable}
          register={register}
          control={control}
          errors={errors}
          setValue={setValue}
          watch={watch}
        />
      </div>

      {/* ✅ Section Classification et catégories */}
      <div className="border-t border-gray-200 dark:border-gray-600 pt-8">
        <CategoriesSection
          product={product}
          editable={editable}
          errors={errors}
          specialFields={specialFields}
        />
      </div>

      {/* ✅ Section Marques et fournisseurs - Déjà atomisée */}
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
              Résumé de l'inventaire
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Stock - Maintenant géré par StockSection */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Gestion des stocks
                </h4>
                <div className="space-y-2">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Stock actuel: <span className="font-medium">{product.stock || 0}</span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Min: <span className="font-medium">{product.min_stock || 'Non défini'}</span>
                  </div>
                </div>
              </div>

              {/* Identification */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Identification
                </h4>
                <div className="space-y-2">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Code-barres:{' '}
                    {product.meta_data?.find((m) => m.key === 'barcode')?.value ? (
                      <span className="font-medium">Défini</span>
                    ) : (
                      <span className="text-gray-500 italic">Non défini</span>
                    )}
                  </div>
                </div>
              </div>

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

              {/* Relations commerciales */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Relations
                </h4>
                <div className="space-y-2">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Marque:{' '}
                    {product.brand_ref?.name ? (
                      <span className="font-medium">{product.brand_ref.name}</span>
                    ) : (
                      <span className="text-gray-500 italic">Aucune</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Fournisseur:{' '}
                    {product.supplier_ref?.name ? (
                      <span className="font-medium">{product.supplier_ref.name}</span>
                    ) : (
                      <span className="text-gray-500 italic">Aucun</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Indicateurs de complétude */}
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Complétude de l'inventaire
              </h4>
              <div className="flex flex-wrap gap-2">
                {[
                  {
                    label: 'Stock défini',
                    condition: product.stock !== undefined && product.stock !== null,
                  },
                  {
                    label: 'Code-barres',
                    condition: !!product.meta_data?.find((m) => m.key === 'barcode')?.value,
                  },
                  { label: 'Catégorisé', condition: product.categories?.length > 0 },
                  { label: 'Marque', condition: !!product.brand_ref?.name },
                  { label: 'Fournisseur', condition: !!product.supplier_ref?.name },
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
