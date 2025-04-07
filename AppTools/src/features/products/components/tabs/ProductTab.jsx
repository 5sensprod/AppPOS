// src/features/products/components/tabs/ProductTab.jsx
import React from 'react';
import EnhancedAIDescriptionSection from '../sections/EnhancedAIDescriptionSection';
import ProductDescriptionDisplay from '../sections/ProductDescriptionDisplay';
import EntityImageManager from '../../../../components/common/EntityImageManager';

/**
 * Onglet Produit qui regroupe la description IA et la gestion des images
 */
const ProductTab = ({
  product,
  editable = false,
  register,
  setValue,
  watch,
  errors,
  entityId,
  uploadImage,
  deleteImage,
  setMainImage,
  isLoading,
  error,
}) => {
  return (
    <div className="space-y-8">
      {/* Section Description avec IA */}
      {editable ? (
        <EnhancedAIDescriptionSection
          product={product}
          editable={editable}
          register={register}
          setValue={setValue}
          watch={watch}
        />
      ) : (
        <ProductDescriptionDisplay description={product?.description} />
      )}

      {/* Section Image avec prévisualisation */}
      <div className="mt-8 border-t pt-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          Images du produit
        </h3>

        <EntityImageManager
          entity={product}
          entityId={entityId}
          entityType="product"
          galleryMode={true}
          onUploadImage={uploadImage}
          onDeleteImage={deleteImage}
          onSetMainImage={setMainImage}
          isLoading={isLoading}
          error={error}
          editable={editable}
        />
      </div>
    </div>
  );
};

export default ProductTab;
