// src/features/products/components/ProductDetail.jsx
import React, { useCallback } from 'react';
import useProductDetail from '../hooks/useProductDetail';
import EntityDetail from '../../../components/common/EntityDetail';
import GeneralInfoTab from '../../../components/common/tabs/GeneralInfoTab';
import InventoryTab from './tabs/InventoryTab';
import ProductTab from './tabs/ProductTab'; // Importer le nouvel onglet
import WooCommerceTab from '../../../components/common/tabs/WooCommerceTab';
import ProductPriceSection from './ProductPriceSection';
import { ENTITY_CONFIG } from '../constants';

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
          );
        case 'product': // Nouvel onglet Produit
          return (
            <ProductTab
              product={entity}
              editable={editable}
              register={register}
              setValue={setValue}
              watch={watch}
              errors={errors}
              entityId={currentId}
              uploadImage={uploadImage}
              deleteImage={deleteImage}
              setMainImage={setMainImage}
              isLoading={loading}
              error={error}
            />
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

  // Définir la liste des onglets visibles avec notre nouvel onglet Produit
  const visibleTabs = [
    { id: 'general', label: 'Général', icon: 'info' },
    { id: 'product', label: 'Produit', icon: 'package' }, // Nouvel onglet
    { id: 'inventory', label: 'Inventaire', icon: 'archive' },
  ];

  // Ajouter l'onglet WooCommerce pour les produits existants
  if (!isNew) {
    visibleTabs.push({ id: 'woocommerce', label: 'WooCommerce', icon: 'shopping-cart' });
  }

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
