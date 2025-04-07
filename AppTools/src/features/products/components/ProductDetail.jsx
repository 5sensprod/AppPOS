// src/features/products/components/ProductDetail.jsx
import React, { useCallback } from 'react';
import useProductDetail from '../hooks/useProductDetail';
import EntityDetail from '../../../components/common/EntityDetail';
import GeneralInfoTab from '../../../components/common/tabs/GeneralInfoTab';
import InventoryTab from './tabs/InventoryTab';
import ImagesTab from '../../../components/common/tabs/ImagesTab';
import WooCommerceTab from '../../../components/common/tabs/WooCommerceTab';
import ProductPriceSection from './ProductPriceSection';
import { ENTITY_CONFIG } from '../constants';
import AIDescriptionSection from './sections/AIDescriptionSection';

function ProductDetail() {
  const {
    product,
    currentId,
    isNew,
    editable,
    loading,
    error,
    success,
    handleSubmit,
    handleDelete,
    handleCancel,
    handleSync,
    validationSchema,
    defaultValues,
    categoryOptions,
    brandOptions,
    supplierOptions,
    uploadImage,
    deleteImage,
    setMainImage,
    hierarchicalCategories,
  } = useProductDetail();

  const renderTabContent = useCallback(
    (entity, activeTab, formProps = {}) => {
      const { editable, register, control, errors, setValue, watch } = formProps;

      switch (activeTab) {
        case 'general':
          return (
            <>
              <GeneralInfoTab
                entity={entity}
                fields={['name', 'sku', 'status']}
                editable={editable}
                additionalSection={
                  <ProductPriceSection
                    product={entity}
                    editable={editable}
                    register={register}
                    errors={errors}
                  />
                }
              />

              {/* Affichage de la section de description: mode lecture ou édition */}
              {editable ? (
                <AIDescriptionSection
                  product={entity}
                  editable={editable}
                  register={register}
                  setValue={setValue}
                  watch={watch}
                />
              ) : (
                <div className="mb-6 mt-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Description du produit
                  </h3>
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-md border dark:border-gray-700">
                    {entity.description ? (
                      <div dangerouslySetInnerHTML={{ __html: entity.description }} />
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400 italic">
                        Aucune description disponible
                      </p>
                    )}
                  </div>
                </div>
              )}
            </>
          );
        case 'inventory':
          return (
            <InventoryTab
              product={entity}
              editable={editable}
              register={register}
              control={control}
              errors={errors}
              specialFields={{
                category_id: {
                  type: 'select',
                  options: [{ value: '', label: 'Aucune catégorie' }, ...categoryOptions],
                },
                categories: {
                  type: 'multiselect',
                  options: categoryOptions,
                },
                brand_id: {
                  type: 'select',
                  options: [{ value: '', label: 'Aucune marque' }, ...brandOptions],
                },
                supplier_id: {
                  type: 'select',
                  options: [{ value: '', label: 'Aucun fournisseur' }, ...supplierOptions],
                },
              }}
              hierarchicalCategories={hierarchicalCategories}
            />
          );
        case 'images':
          return (
            <ImagesTab
              entity={entity}
              entityId={currentId}
              entityType="product"
              galleryMode={true}
              onUploadImage={uploadImage}
              onDeleteImage={deleteImage}
              onSetMainImage={setMainImage}
              isLoading={loading}
              error={error}
            />
          );
        case 'woocommerce':
          return <WooCommerceTab entity={entity} entityType="product" onSync={handleSync} />;
        default:
          return null;
      }
    },
    [
      categoryOptions,
      brandOptions,
      supplierOptions,
      uploadImage,
      deleteImage,
      setMainImage,
      handleSync,
      hierarchicalCategories,
      currentId,
      loading,
      error,
    ]
  );

  const visibleTabs = isNew
    ? ENTITY_CONFIG.tabs.filter((t) => !['images', 'woocommerce'].includes(t.id))
    : ENTITY_CONFIG.tabs;

  return (
    <EntityDetail
      entity={product}
      entityId={currentId}
      entityName="produit"
      entityNamePlural="produits"
      baseRoute="/products"
      tabs={visibleTabs}
      renderTabContent={renderTabContent}
      actions={['edit', 'delete']}
      syncEnabled={true}
      onDelete={handleDelete}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      onSync={handleSync}
      isLoading={loading}
      error={error}
      success={success}
      editable={editable}
      validationSchema={validationSchema}
      defaultValues={defaultValues}
    />
  );
}

export default ProductDetail;
