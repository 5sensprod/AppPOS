// src/features/products/components/sections/CategoriesSection.jsx
import React, { useMemo, useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { Star } from 'lucide-react';
import BrandSelectField from '../../../../components/common/fields/BrandSelectField';
import SupplierSelectField from '../../../../components/common/fields/SupplierSelectField';
import CategorySelector from '../../../../components/common/CategorySelector';

// ===== COMPOSANTS UI SIMPLES =====

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

// ===== MODE LECTURE =====

const ReadOnlyView = ({ product }) => {
  return (
    <div>
      <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-6">
        Catégories et relations
      </h2>

      <div className="space-y-6">
        {/* Catégories - Affichage simple */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Catégories du produit
          </label>

          {/* ✅ CategorySelector en mode lecture avec les catégories existantes */}
          <CategorySelector
            mode="multiple"
            selectedCategories={product.categories || []}
            primaryCategoryId={product.category_id || ''}
            disabled={true}
            showSearch={false}
            showCounts={false}
          />

          {(!product.categories || product.categories.length === 0) && (
            <InfoBox isEmpty>Aucune catégorie associée</InfoBox>
          )}
        </div>

        {/* Services */}
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

// ===== MODE ÉDITION =====

const EditableView = ({ errors, specialFields }) => {
  const { watch, setValue } = useFormContext();

  // État du formulaire
  const selectedBrandId = watch('brand_id');
  const selectedSupplierId = watch('supplier_id');
  const selectedCategoryId = watch('category_id');
  const selectedCategories = watch('categories') || [];

  // Options avec filtrage croisé marques/fournisseurs
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

  // Synchronisation automatique marques ↔ fournisseurs
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

  // Synchronisation catégorie principale → catégories
  useEffect(() => {
    if (selectedCategoryId && !selectedCategories.includes(selectedCategoryId)) {
      setValue('categories', [...selectedCategories, selectedCategoryId]);
    }
  }, [selectedCategoryId, selectedCategories, setValue]);

  // Handler pour CategorySelector
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
        {/* ✅ CategorySelector gère TOUT automatiquement */}
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

        {/* Services avec filtrage croisé */}
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
  register, // Non utilisé mais gardé pour compatibilité
  control, // Non utilisé mais gardé pour compatibilité
  errors,
  specialFields,
}) => {
  return editable ? (
    <EditableView errors={errors} specialFields={specialFields} />
  ) : (
    <ReadOnlyView product={product} />
  );
};

export default CategoriesSection;
