// src/features/products/components/ProductDetail.jsx
import React from 'react';
import { useParams } from 'react-router-dom';
import { useProduct, useProductExtras } from '../stores/productStore';
import { useProductDataStore } from '../stores/productStore';
import { EntityDetail } from '../../../components/common';
import GeneralInfoTab from '../../../components/common/tabs/GeneralInfoTab';
import InventoryTab from './tabs/InventoryTab';
import ImagesTab from '../../../components/common/tabs/ImagesTab';
import WooCommerceTab from '../../../components/common/tabs/WooCommerceTab';
import ProductPriceSection from './ProductPriceSection';
import { ENTITY_CONFIG } from '../constants';
import { useEntityDetail } from '../../../hooks/useEntityDetail';

function ProductDetail() {
  const { id } = useParams();
  const { getProductById, deleteProduct, syncProduct, updateProduct } = useProduct();
  const { uploadImage, uploadGalleryImage, deleteImage, deleteGalleryImage, setMainImage } =
    useProductExtras();

  // Utiliser le store WebSocket dédié
  const productWsStore = useProductDataStore();

  // Utiliser le hook mis à jour avec le store WebSocket
  const {
    entity: product,
    loading,
    error,
    handleSync,
    handleUpdate,
    handleUploadImage,
    handleDeleteImage,
    handleSetMainImage,
  } = useEntityDetail({
    id,
    entityType: 'product',
    getEntityById: getProductById,
    wsStore: productWsStore,
    syncEntity: syncProduct,
    updateEntity: updateProduct,
    uploadImage,
    deleteImage,
    uploadGalleryImage,
    deleteGalleryImage,
    setMainImage,
  });

  // Rendu du contenu des onglets avec les composants réutilisables
  const renderTabContent = (product, activeTab) => {
    switch (activeTab) {
      case 'general':
        return (
          <GeneralInfoTab
            entity={product}
            fields={['name', 'sku', 'description', 'status']}
            additionalSection={<ProductPriceSection product={product} />}
          />
        );

      case 'inventory':
        return <InventoryTab product={product} />;

      case 'images':
        return (
          <ImagesTab
            entity={product}
            entityId={id}
            entityType="product"
            galleryMode={true}
            onUploadImage={handleUploadImage}
            onDeleteImage={handleDeleteImage}
            onSetMainImage={handleSetMainImage}
            isLoading={loading}
            error={error}
          />
        );

      case 'woocommerce':
        return <WooCommerceTab entity={product} entityType="product" onSync={handleSync} />;

      default:
        return null;
    }
  };

  return (
    <EntityDetail
      entity={product}
      entityId={id}
      entityName="produit"
      entityNamePlural="produits"
      baseRoute="/products"
      tabs={ENTITY_CONFIG.tabs}
      renderTabContent={renderTabContent}
      actions={['edit', 'delete']}
      syncEnabled={ENTITY_CONFIG.syncEnabled}
      onDelete={deleteProduct}
      onSync={handleSync}
      onUpdate={handleUpdate}
      isLoading={loading}
      error={error}
    />
  );
}

export default ProductDetail;
