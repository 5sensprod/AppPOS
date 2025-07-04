// src/features/products/components/sections/BrandsSuppliersSection.jsx
import React, { useMemo, useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { Tag, Truck, Star } from 'lucide-react';
import BrandSelectField from '../../../../components/common/fields/BrandSelectField';
import SupplierSelectField from '../../../../components/common/fields/SupplierSelectField';

// ===== COMPOSANTS UI =====

const ServiceChip = ({ service, type, isPrimary = false, showImage = true }) => {
  const colorClasses = {
    brand: isPrimary
      ? 'bg-purple-50 text-purple-800 border-purple-300 border-2 dark:bg-purple-900/30 dark:text-purple-200 dark:border-purple-700'
      : 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-200 dark:border-purple-700',
    supplier: isPrimary
      ? 'bg-green-50 text-green-800 border-green-300 border-2 dark:bg-green-900/30 dark:text-green-200 dark:border-green-700'
      : 'bg-green-50 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-200 dark:border-green-700',
  };

  return (
    <div className={`inline-flex items-center px-3 py-2 rounded-lg border ${colorClasses[type]}`}>
      {isPrimary && <Star className="h-3 w-3 mr-1 text-yellow-500 fill-current" />}
      {showImage && service.image?.src && (
        <img
          src={service.image.src}
          alt={service.name || service}
          className="w-5 h-5 object-cover rounded mr-2"
        />
      )}
      <span className="font-medium">{service.name || service}</span>
    </div>
  );
};

// ===== MODE LECTURE =====

const ReadOnlyView = ({ product }) => {
  return (
    <div>
      <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-6">
        <div className="flex items-center">
          <Tag className="h-5 w-5 mr-2" />
          <span>Marques et fournisseurs</span>
        </div>
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Marque */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            <Tag className="inline h-4 w-4 mr-1" />
            Marque du produit
          </label>
          {product.brand_ref?.name ? (
            <ServiceChip service={product.brand_ref} type="brand" isPrimary={true} />
          ) : (
            <div className="px-4 py-3 border-2 border-dashed rounded-lg border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-800">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Aucune marque définie
              </span>
            </div>
          )}
        </div>

        {/* Fournisseur */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            <Truck className="inline h-4 w-4 mr-1" />
            Fournisseur principal
          </label>
          {product.supplier_ref?.name ? (
            <ServiceChip service={product.supplier_ref} type="supplier" isPrimary={true} />
          ) : (
            <div className="px-4 py-3 border-2 border-dashed rounded-lg border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-800">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Aucun fournisseur défini
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ===== MODE ÉDITION =====

const EditableView = ({ errors, specialFields }) => {
  const { watch, setValue } = useFormContext();

  const selectedBrandId = watch('brand_id');
  const selectedSupplierId = watch('supplier_id');

  const allBrands = specialFields.brand_id?.options || [];
  const allSuppliers = specialFields.supplier_id?.options || [];

  // Filtrage croisé intelligent
  const filteredBrands = useMemo(() => {
    if (!selectedSupplierId) return allBrands;
    return allBrands.filter((brand) => brand.suppliers?.includes(selectedSupplierId));
  }, [selectedSupplierId, allBrands]);

  const filteredSuppliers = useMemo(() => {
    if (!selectedBrandId) return allSuppliers;
    return allSuppliers.filter((supplier) => supplier.brands?.includes(selectedBrandId));
  }, [selectedBrandId, allSuppliers]);

  // Synchronisation automatique
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
      <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-6">
        <div className="flex items-center">
          <Tag className="h-5 w-5 mr-2" />
          <span>Marques et fournisseurs</span>
        </div>
      </h2>

      <div className="space-y-6">
        {/* Sélection marque et fournisseur */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Tag className="inline h-4 w-4 mr-1" />
              Marque du produit
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
              <Truck className="inline h-4 w-4 mr-1" />
              Fournisseur principal
            </label>
            <SupplierSelectField name="supplier_id" options={filteredSuppliers} editable={true} />
            {errors?.supplier_id && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-500">
                {errors.supplier_id.message}
              </p>
            )}
          </div>
        </div>

        {/* État de la synchronisation */}
        {(selectedBrandId || selectedSupplierId) && (
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
              Synchronisation intelligente
            </h3>
            <div className="text-xs text-blue-600 dark:text-blue-300 space-y-1">
              {selectedBrandId && selectedSupplierId && (
                <p>✅ Marque et fournisseur sont cohérents</p>
              )}
              {selectedBrandId && !selectedSupplierId && (
                <p>⚠️ Sélectionnez un fournisseur compatible avec cette marque</p>
              )}
              {!selectedBrandId && selectedSupplierId && (
                <p>⚠️ Sélectionnez une marque disponible chez ce fournisseur</p>
              )}
              <p>• Les options sont filtrées automatiquement pour garantir la cohérence</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ===== COMPOSANT PRINCIPAL =====

const BrandsSuppliersSection = ({
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

export default BrandsSuppliersSection;
