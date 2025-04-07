import React, { useMemo, useEffect } from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import MultiHierarchicalSelector from '../../../../components/common/MultiHierarchicalSelector';

const CategoriesSection = ({
  product,
  editable,
  register,
  control,
  errors,
  specialFields,
  hierarchicalCategories,
}) => {
  if (!editable) {
    return (
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
              {product.category_info?.primary ? (
                <>
                  {product.category_info.primary.name}
                  {product.category_info.primary.path_string &&
                    product.category_info.primary.path.length > 1 && (
                      <span className="text-xs text-gray-500 ml-2">
                        ({product.category_info.primary.path_string})
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
    );
  }

  const { watch, setValue } = useFormContext();
  const selectedBrandId = watch('brand_id');
  const selectedSupplierId = watch('supplier_id');

  const allBrands = specialFields.brand_id?.options || [];
  const allSuppliers = specialFields.supplier_id?.options || [];

  const filteredBrands = useMemo(() => {
    if (!selectedSupplierId) return allBrands;
    return allBrands.filter((brand) => brand.suppliers?.includes(selectedSupplierId));
  }, [selectedSupplierId, allBrands]);

  const filteredSuppliers = useMemo(() => {
    if (!selectedBrandId) return allSuppliers;
    return allSuppliers.filter((supplier) => supplier.brands?.includes(selectedBrandId));
  }, [selectedBrandId, allSuppliers]);

  // Reset l'autre champ si non valide
  useEffect(() => {
    const brand = allBrands.find((b) => b.value === selectedBrandId);
    if (selectedSupplierId && brand && !brand.suppliers?.includes(selectedSupplierId)) {
      setValue('brand_id', '');
    }
  }, [selectedSupplierId, allBrands, selectedBrandId, setValue]);

  useEffect(() => {
    const supplier = allSuppliers.find((s) => s.value === selectedSupplierId);
    if (selectedBrandId && supplier && !supplier.brands?.includes(selectedBrandId)) {
      setValue('supplier_id', '');
    }
  }, [selectedBrandId, allSuppliers, selectedSupplierId, setValue]);

  return (
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
          {control && (
            <Controller
              name="categories"
              control={control}
              render={({ field }) => (
                <MultiHierarchicalSelector
                  hierarchicalData={hierarchicalCategories}
                  values={field.value || []}
                  onChange={field.onChange}
                  currentSelected={product ? [product.category_id].filter(Boolean) : []}
                  placeholder="Sélectionner des catégories additionnelles"
                />
              )}
            />
          )}
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Cliquez sur une catégorie pour la sélectionner/désélectionner
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
            {filteredBrands.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors?.brand_id && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-500">{errors.brand_id.message}</p>
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
            {filteredSuppliers.map((option) => (
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
  );
};

export default CategoriesSection;
