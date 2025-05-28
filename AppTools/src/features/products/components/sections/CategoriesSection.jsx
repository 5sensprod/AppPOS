import React, { useMemo, useEffect } from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import MultiHierarchicalSelector from '../../../../components/common/MultiHierarchicalSelector';

// Fonction utilitaire pour construire la hiérarchie complète des catégories
// Compatible avec la structure hierarchicalCategories existante (_id, name, children)
const getCategoriesWithHierarchy = (
  selectedCategories,
  hierarchicalCategories,
  primaryCategoryId
) => {
  const result = [];
  const processedCategories = new Set();

  // Fonction récursive pour trouver une catégorie et construire son chemin complet
  const buildCategoryPath = (categories, targetId, currentPath = []) => {
    for (const category of categories) {
      const newPath = [
        ...currentPath,
        {
          id: category._id,
          name: category.name,
          level: currentPath.length,
          woo_id: category.woo_id || null,
        },
      ];

      // Si on a trouvé la catégorie cible, retourner le chemin complet
      if (category._id === targetId) {
        return newPath;
      }

      // Chercher récursivement dans les enfants
      if (category.children && category.children.length > 0) {
        const foundPath = buildCategoryPath(category.children, targetId, newPath);
        if (foundPath) return foundPath;
      }
    }
    return null;
  };

  // Pour chaque catégorie sélectionnée, construire sa hiérarchie complète
  selectedCategories.forEach((categoryId) => {
    if (!processedCategories.has(categoryId)) {
      const hierarchy = buildCategoryPath(hierarchicalCategories, categoryId);

      if (hierarchy && hierarchy.length > 0) {
        result.push({
          categoryId,
          hierarchy,
          isPrimary: categoryId === primaryCategoryId,
        });

        // Marquer toutes les catégories de cette hiérarchie comme traitées
        // pour éviter les doublons dans l'affichage
        hierarchy.forEach((cat) => processedCategories.add(cat.id));
      } else {
        // Fallback : si la catégorie n'est pas trouvée dans hierarchicalCategories,
        // essayer de la récupérer depuis categoryOptions (liste plate)
        const fallbackCategory = specialFields?.category_id?.options?.find(
          (opt) => opt.value === categoryId
        );
        if (fallbackCategory) {
          result.push({
            categoryId,
            hierarchy: [
              {
                id: categoryId,
                name: fallbackCategory.label.replace(/^—+\s*/, ''),
                level: 0,
                woo_id: null,
              },
            ],
            isPrimary: categoryId === primaryCategoryId,
          });
          processedCategories.add(categoryId);
        }
      }
    }
  });

  // Trier les résultats : catégorie principale en premier, puis par ordre alphabétique
  return result.sort((a, b) => {
    if (a.isPrimary && !b.isPrimary) return -1;
    if (!a.isPrimary && b.isPrimary) return 1;

    // Trier par le nom de la catégorie finale (dernière dans la hiérarchie)
    const aName = a.hierarchy[a.hierarchy.length - 1]?.name || '';
    const bName = b.hierarchy[b.hierarchy.length - 1]?.name || '';
    return aName.localeCompare(bName);
  });
};

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
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Catégories additionnelles
            </h3>
            <p className="mt-1 text-gray-900 dark:text-gray-100">
              {product.category_info?.refs && product.category_info.refs.length > 1
                ? product.category_info.refs
                    .filter((ref) => ref.id !== product.category_id)
                    .map((ref) => ref.name)
                    .join(', ') || 'Aucune'
                : 'Aucune'}
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

  // NOUVEAU: Synchroniser category_id avec categories array
  useEffect(() => {
    if (selectedCategoryId) {
      // Si une catégorie principale est sélectionnée, s'assurer qu'elle est dans le tableau
      if (!selectedCategories.includes(selectedCategoryId)) {
        const newCategories = [...selectedCategories, selectedCategoryId];
        setValue('categories', newCategories);
        console.log('🔄 Synchronisation: Ajout de category_id dans categories array');
      }
    }
  }, [selectedCategoryId, selectedCategories, setValue]);

  // NOUVEAU: Gérer la suppression des catégories
  const handleCategoriesChange = (newCategories) => {
    console.log('📝 Changement de catégories:', {
      ancien: selectedCategories,
      nouveau: newCategories,
      categoryId: selectedCategoryId,
    });

    // Mettre à jour le tableau des catégories
    setValue('categories', newCategories);

    // Si la catégorie principale n'est plus dans le tableau, la réinitialiser
    if (selectedCategoryId && !newCategories.includes(selectedCategoryId)) {
      console.log('🗑️ Suppression de la catégorie principale, réinitialisation...');
      setValue('category_id', '');
    }
    // Si aucune catégorie principale n'est définie et qu'il y a des catégories, prendre la première
    else if (!selectedCategoryId && newCategories.length > 0) {
      console.log('🎯 Définition de la première catégorie comme principale');
      setValue('category_id', newCategories[0]);
    }
  };

  // NOUVEAU: Gérer le changement de catégorie principale
  const handlePrimaryCategoryChange = (newCategoryId) => {
    console.log('🎯 Changement de catégorie principale:', newCategoryId);

    setValue('category_id', newCategoryId);

    // S'assurer que la nouvelle catégorie principale est dans le tableau
    if (newCategoryId && !selectedCategories.includes(newCategoryId)) {
      const newCategories = [...selectedCategories, newCategoryId];
      setValue('categories', newCategories);
    }
  };

  return (
    <div>
      <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
        Catégories et relations
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section catégories */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Catégorie principale */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Catégorie principale
              </label>
              <select
                {...register('category_id')}
                onChange={(e) => handlePrimaryCategoryChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">Aucune catégorie principale</option>
                {specialFields.category_id?.options?.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Cette catégorie sera utilisée comme catégorie principale du produit
              </p>
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
              {control && (
                <Controller
                  name="categories"
                  control={control}
                  render={({ field }) => (
                    <MultiHierarchicalSelector
                      hierarchicalData={hierarchicalCategories}
                      values={field.value || []}
                      onChange={handleCategoriesChange}
                      currentSelected={selectedCategories}
                      placeholder="Sélectionner des catégories"
                      showSelectedCount={true}
                    />
                  )}
                />
              )}
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Toutes les catégories associées au produit (y compris la principale)
              </p>
              {errors?.categories && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-500">
                  {errors.categories.message}
                </p>
              )}
            </div>
          </div>

          {/* Aperçu des catégories sélectionnées */}
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
                  <div key={groupIndex} className="flex flex-wrap gap-1 items-center">
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
