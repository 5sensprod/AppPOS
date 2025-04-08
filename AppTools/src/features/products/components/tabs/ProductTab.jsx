// src/features/products/components/tabs/ProductTab.jsx
import React from 'react';
import EnhancedAIDescriptionSection from '../sections/EnhancedAIDescriptionSection';
import ProductDescriptionDisplay from '../sections/ProductDescriptionDisplay';
import EntityImageManager from '../../../../components/common/EntityImageManager';

/**
 * Onglet Produit qui regroupe la description IA à gauche et la gestion des images à droite
 * avec l'image à la une au-dessus de la galerie
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
    <div className="flex flex-col md:flex-row gap-8">
      {/* Colonne gauche: Section Description avec IA - plus large */}
      <div className="w-full md:w-3/5">
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
      </div>

      {/* Colonne droite: Section Images - moins large */}
      <div className="w-full md:w-2/5">
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
          featuredImageOnTop={true}
        />
      </div>
    </div>
  );
};

export default ProductTab;
