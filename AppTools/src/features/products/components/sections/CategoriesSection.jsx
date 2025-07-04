// src/features/products/components/sections/CategoriesSection.jsx
import React, { useMemo, useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { Star } from 'lucide-react';
import BrandSelectField from '../../../../components/common/fields/BrandSelectField';
import SupplierSelectField from '../../../../components/common/fields/SupplierSelectField';
import CategorySelector from '../../../../components/common/CategorySelector';

// ===== UTILITAIRES DE CATÉGORIES (logique ProductTable.jsx) =====

const buildCategoryMaps = (hierarchicalCategories) => {
  const categoryPathMap = {};
  const categoryNameMap = {};

  const buildMaps = (categories, parentPath = '') => {
    categories.forEach((cat) => {
      const currentPath = parentPath ? `${parentPath}/${cat._id}` : cat._id;
      categoryPathMap[cat._id] = currentPath;
      categoryNameMap[cat._id] = cat.name;

      if (cat.children?.length > 0) {
        buildMaps(cat.children, currentPath);
      }
    });
  };

  buildMaps(hierarchicalCategories);
  return { categoryPathMap, categoryNameMap };
};

const buildCategoryNamePath = (categoryId, categoryPathMap, categoryNameMap) => {
  if (!categoryPathMap[categoryId]) return null;

  const pathIds = categoryPathMap[categoryId].split('/');
  const pathNames = pathIds.map((id) => categoryNameMap[id]).filter(Boolean);

  return pathNames.join(' > ');
};

const getCategoriesWithHierarchy = (
  selectedCategories,
  hierarchicalCategories,
  primaryCategoryId
) => {
  const result = [];
  const processedCategories = new Set();
  const { categoryPathMap, categoryNameMap } = buildCategoryMaps(hierarchicalCategories);

  selectedCategories.forEach((categoryId) => {
    if (!processedCategories.has(categoryId) && categoryPathMap[categoryId]) {
      const pathIds = categoryPathMap[categoryId].split('/');

      const hierarchy = pathIds.map((id, index) => ({
        id: id,
        name: categoryNameMap[id],
        level: index,
      }));

      result.push({
        categoryId,
        hierarchy,
        isPrimary: categoryId === primaryCategoryId,
      });

      pathIds.forEach((id) => processedCategories.add(id));
    }
  });

  return result.sort((a, b) => {
    if (a.isPrimary && !b.isPrimary) return -1;
    if (!a.isPrimary && b.isPrimary) return 1;
    const aName = a.hierarchy[a.hierarchy.length - 1]?.name || '';
    const bName = b.hierarchy[b.hierarchy.length - 1]?.name || '';
    return aName.localeCompare(bName);
  });
};

// ===== COMPOSANTS UI =====

const CategoryChip = ({ category, isPrimary, fullPath, isChild, pathParts }) => (
  <div
    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
      isPrimary
        ? 'bg-blue-100 text-blue-800 border-2 border-blue-300 dark:bg-blue-800 dark:text-blue-100'
        : 'bg-gray-100 text-gray-700 border border-gray-300 dark:bg-gray-700 dark:text-gray-300'
    }`}
    title={fullPath}
  >
    {isPrimary && <Star className="h-3 w-3 mr-1 text-yellow-500 fill-current" />}
    <span>
      {isChild ? (
        <>
          <span className="opacity-60 text-xs">
            {pathParts.slice(0, -1).join(' > ')} {'>'}
          </span>
          <span className="font-medium ml-1">{category.name}</span>
        </>
      ) : (
        category.name
      )}
    </span>
  </div>
);

const InfoBox = ({ children, isEmpty = false }) => (
  <div
    className={`w-full flex items-center justify-center px-4 py-3 border-2 border-dashed rounded-lg ${
      isEmpty
        ? 'border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-800'
        : 'border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-800'
    }`}
  >
    <span className="text-sm text-gray-500 dark:text-gray-400">{children}</span>
  </div>
);

const ServiceChip = ({ service, color = 'purple' }) => {
  const colorClasses = {
    purple:
      'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-200 dark:border-purple-700',
    green:
      'bg-green-50 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-200 dark:border-green-700',
  };

  return (
    <div className={`inline-flex items-center px-3 py-2 rounded-lg border ${colorClasses[color]}`}>
      <span className="font-medium">{service}</span>
    </div>
  );
};

const HierarchyPreview = ({ categoryGroup, selectedCategoryId, selectedCategories }) => (
  <div className="flex flex-wrap gap-1 items-center">
    {categoryGroup.hierarchy.map((cat, index) => {
      const isPrimary = cat.id === selectedCategoryId;
      const isDirectlySelected = selectedCategories.includes(cat.id);

      return (
        <React.Fragment key={cat.id}>
          {index > 0 && <span className="text-gray-400 text-xs mx-1">→</span>}
          <span
            className={`px-2 py-1 rounded-full text-xs ${
              isPrimary
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100 font-medium border-2 border-blue-300'
                : isDirectlySelected
                  ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100 font-medium'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-600 dark:text-gray-300'
            }`}
            title={
              isPrimary
                ? 'Catégorie principale'
                : isDirectlySelected
                  ? 'Catégorie sélectionnée'
                  : 'Catégorie parente (automatique)'
            }
          >
            {cat.name}
            {isPrimary && ' ★'}
          </span>
        </React.Fragment>
      );
    })}
  </div>
);

// ===== SECTIONS =====

const ReadOnlyView = ({ product, hierarchicalCategories }) => {
  const displayCategories = product.category_info?.refs || [];

  const buildCategoryPathFromHierarchy = (categoryId) => {
    const { categoryPathMap, categoryNameMap } = buildCategoryMaps(hierarchicalCategories);
    return buildCategoryNamePath(categoryId, categoryPathMap, categoryNameMap);
  };

  return (
    <div>
      <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-6">
        Catégories et relations
      </h2>

      <div className="space-y-6">
        {/* Catégories */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Catégories du produit
          </label>

          {displayCategories.length > 0 ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {displayCategories.map((category) => {
                  const isPrimary = category.id === product.category_id;
                  const fullPath = buildCategoryPathFromHierarchy(category.id);
                  const pathParts = fullPath ? fullPath.split(' > ') : [category.name];
                  const isChild = pathParts.length > 1;

                  return (
                    <CategoryChip
                      key={category.id}
                      category={category}
                      isPrimary={isPrimary}
                      fullPath={fullPath}
                      isChild={isChild}
                      pathParts={pathParts}
                    />
                  );
                })}
              </div>

              <div className="text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center">
                  <Star className="h-3 w-3 mr-1 text-yellow-500 fill-current" />
                  <span>Catégorie principale</span>
                </div>
              </div>
            </div>
          ) : (
            <InfoBox isEmpty>Aucune catégorie associée</InfoBox>
          )}
        </div>

        {/* ✅ Services - Affichage simple sans BrandSelectField/SupplierSelectField */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Marque
            </label>
            {product.brand_ref?.name ? (
              <ServiceChip service={product.brand_ref.name} color="purple" />
            ) : (
              <InfoBox isEmpty>Aucune marque</InfoBox>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Fournisseur
            </label>
            {product.supplier_ref?.name ? (
              <ServiceChip service={product.supplier_ref.name} color="green" />
            ) : (
              <InfoBox isEmpty>Aucun fournisseur</InfoBox>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const EditableView = ({ register, control, errors, specialFields, hierarchicalCategories }) => {
  const { watch, setValue } = useFormContext();
  const selectedBrandId = watch('brand_id');
  const selectedSupplierId = watch('supplier_id');
  const selectedCategoryId = watch('category_id');
  const selectedCategories = watch('categories') || [];

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

  // Logique de synchronisation
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

  useEffect(() => {
    if (selectedCategoryId && !selectedCategories.includes(selectedCategoryId)) {
      const newCategories = [...selectedCategories, selectedCategoryId];
      setValue('categories', newCategories);
    }
  }, [selectedCategoryId, selectedCategories, setValue]);

  const handleCategoryChange = ({ categories, primaryId }) => {
    setValue('categories', categories);
    setValue('category_id', primaryId);
  };

  return (
    <div>
      <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-6">
        Catégories et relations
      </h2>

      <div className="space-y-6">
        {/* Sélecteur moderne */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Catégories du produit
          </label>

          <CategorySelector
            mode="multiple"
            hierarchicalData={hierarchicalCategories}
            selectedCategories={selectedCategories}
            primaryCategoryId={selectedCategoryId}
            onMultipleChange={handleCategoryChange}
            placeholder="Ajouter des catégories au produit"
            showSearch={true}
            showCounts={true}
          />

          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            <p>• Ajoutez une ou plusieurs catégories à votre produit</p>
            <p>• La première catégorie devient automatiquement la catégorie principale</p>
            <p>• Cliquez sur ★ pour changer la catégorie principale</p>
          </div>

          {(errors?.category_id || errors?.categories) && (
            <div className="mt-2 text-sm text-red-600 dark:text-red-500">
              {errors?.category_id?.message || errors?.categories?.message}
            </div>
          )}
        </div>

        {/* Aperçu */}
        {(selectedCategoryId || selectedCategories.length > 0) && (
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Aperçu des catégories sélectionnées:
            </h4>
            <div className="space-y-3">
              {getCategoriesWithHierarchy(
                selectedCategories,
                hierarchicalCategories,
                selectedCategoryId
              ).map((categoryGroup, groupIndex) => (
                <HierarchyPreview
                  key={groupIndex}
                  categoryGroup={categoryGroup}
                  selectedCategoryId={selectedCategoryId}
                  selectedCategories={selectedCategories}
                />
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              ★ = Catégorie principale •
              <span className="inline-block w-3 h-3 bg-green-100 dark:bg-green-800 rounded-full mx-1"></span>
              Sélectionnées directement •
              <span className="inline-block w-3 h-3 bg-gray-100 dark:bg-gray-600 rounded-full mx-1"></span>
              Catégories parentes (automatiques)
            </p>
          </div>
        )}

        {/* ✅ Services avec tes composants (qui ont déjà des Controllers) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Marque
            </label>
            <BrandSelectField name="brand_id" options={filteredBrands} editable={true} />
            {errors?.brand_id && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-500">
                {errors.brand_id.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Fournisseur
            </label>
            <SupplierSelectField name="supplier_id" options={filteredSuppliers} editable={true} />
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

// ===== COMPOSANT PRINCIPAL =====

const CategoriesSection = ({
  product,
  editable,
  register,
  control,
  errors,
  specialFields,
  hierarchicalCategories,
}) => {
  return editable ? (
    <EditableView
      register={register}
      control={control}
      errors={errors}
      specialFields={specialFields}
      hierarchicalCategories={hierarchicalCategories}
    />
  ) : (
    <ReadOnlyView product={product} hierarchicalCategories={hierarchicalCategories} />
  );
};

export default CategoriesSection;
