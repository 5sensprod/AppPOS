// src/features/products/components/sections/CategoriesSection.jsx
import React, { useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { FolderTree, Star, ChevronRight } from 'lucide-react';
import CategorySelector from '../../../../components/common/CategorySelector';

// ===== COMPOSANTS UI =====

const CategoryBreadcrumb = ({ category, isPrimary = false }) => {
  if (!category) return null;

  // Utiliser les données déjà présentes dans category_info
  const pathString = category.path_string || category.name;
  const pathParts = pathString.split(' > ');

  return (
    <div
      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
        isPrimary
          ? 'bg-blue-100 text-blue-800 border-2 border-blue-300 dark:bg-blue-800 dark:text-blue-100'
          : 'bg-gray-100 text-gray-700 border border-gray-300 dark:bg-gray-700 dark:text-gray-300'
      }`}
    >
      {isPrimary && <Star className="h-3 w-3 mr-1 text-yellow-500 fill-current" />}

      {pathParts.length > 1 ? (
        <>
          <span className="opacity-60 text-xs">{pathParts.slice(0, -1).join(' > ')}</span>
          <ChevronRight className="h-3 w-3 mx-1 opacity-60" />
          <span className="font-medium">{pathParts[pathParts.length - 1]}</span>
        </>
      ) : (
        <span className="font-medium">{category.name}</span>
      )}
    </div>
  );
};

// ===== MODE LECTURE =====

const ReadOnlyView = ({ product }) => {
  // ✅ Filtrer pour afficher seulement les catégories sélectionnées par l'utilisateur
  const userSelectedCategories = (product.categories || [])
    .map((categoryId) => {
      // Trouver la catégorie dans category_info.refs
      const categoryRef = product.category_info?.refs?.find((ref) => ref.id === categoryId);
      return categoryRef;
    })
    .filter(Boolean); // Supprimer les undefined

  return (
    <div>
      <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-6">
        <FolderTree className="inline h-5 w-5 mr-2" />
        Classification et catégories
      </h2>

      <div className="space-y-4">
        {userSelectedCategories.length > 0 ? (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Catégories du produit
              </label>

              {/* ✅ Fil d'Ariane avec hiérarchie - seulement les catégories sélectionnées */}
              <div className="flex flex-wrap gap-2">
                {userSelectedCategories.map((category) => {
                  const isPrimary = category.id === product.category_id;
                  return (
                    <CategoryBreadcrumb
                      key={category.id}
                      category={category}
                      isPrimary={isPrimary}
                    />
                  );
                })}
              </div>

              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center">
                <Star className="h-3 w-3 mr-1 text-yellow-500 fill-current" />
                <span>Catégorie principale</span>
              </div>
            </div>
          </>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Catégories du produit
            </label>
            <div className="w-full flex items-center justify-center px-4 py-3 border-2 border-dashed rounded-lg border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-800">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Aucune catégorie associée
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ===== MODE ÉDITION =====

const EditableView = ({ errors }) => {
  const { watch, setValue } = useFormContext();

  const selectedCategoryId = watch('category_id');
  const selectedCategories = watch('categories') || [];

  // Synchronisation catégorie principale → catégories
  useEffect(() => {
    if (selectedCategoryId && !selectedCategories.includes(selectedCategoryId)) {
      setValue('categories', [...selectedCategories, selectedCategoryId]);
    }
  }, [selectedCategoryId, selectedCategories, setValue]);

  const handleCategoryChange = ({ categories, primaryId }) => {
    setValue('categories', categories);
    setValue('category_id', primaryId);
  };

  return (
    <div>
      <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-6">
        <FolderTree className="inline h-5 w-5 mr-2" />
        Classification et catégories
      </h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Catégories du produit
          </label>

          <CategorySelector
            mode="multiple"
            selectedCategories={selectedCategories}
            primaryCategoryId={selectedCategoryId}
            onMultipleChange={handleCategoryChange}
            placeholder="Ajouter des catégories au produit"
            showSearch={true}
            showCounts={true}
            theme="elegant"
          />

          {/* ✅ Aide simplifiée et concise */}
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Première catégorie = catégorie principale (★) • Cliquez sur ★ pour changer
          </div>

          {(errors?.category_id || errors?.categories) && (
            <div className="mt-2 text-sm text-red-600 dark:text-red-500">
              {errors?.category_id?.message || errors?.categories?.message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ===== COMPOSANT PRINCIPAL =====

const CategoriesSection = ({
  product,
  editable,
  register, // Non utilisé mais gardé pour compatibilité
  control, // Non utilisé mais gardé pour compatibilité
  errors,
  specialFields, // Non utilisé mais gardé pour compatibilité
}) => {
  return editable ? <EditableView errors={errors} /> : <ReadOnlyView product={product} />;
};

export default CategoriesSection;
