// AppTools\src\features\brands\components\BrandDetail.jsx
import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useBrand, useBrandExtras } from '../stores/brandStore'; // Import depuis le store Zustand
import { EntityDetail } from '../../../components/common';
import GeneralInfoTab from '../../../components/common/tabs/GeneralInfoTab';
import ImagesTab from '../../../components/common/tabs/ImagesTab';
import WooCommerceTab from '../../../components/common/tabs/WooCommerceTab';
import { ENTITY_CONFIG } from '../constants';
import { useEntityDetail } from '../../../hooks/useEntityDetail';

function BrandDetail() {
  const { id } = useParams();
  const { getBrandById, deleteBrand, initWebSocketListeners } = useBrand();
  const { uploadImage, deleteImage, syncBrand } = useBrandExtras();

  // Initialiser les écouteurs WebSocket au montage du composant
  useEffect(() => {
    const cleanup = initWebSocketListeners();
    return cleanup;
  }, [initWebSocketListeners]);

  // Utiliser le hook personnalisé pour gérer les détails de la marque
  const {
    entity: brand,
    loading,
    error,
    handleSync,
    handleUploadImage,
    handleDeleteImage,
  } = useEntityDetail({
    id,
    entityType: 'brand',
    getEntityById: getBrandById,
    syncEntity: syncBrand,
    uploadImage,
    deleteImage,
  });

  // Rendu du contenu des onglets
  const renderTabContent = (brand, activeTab) => {
    switch (activeTab) {
      case 'general':
        return (
          <GeneralInfoTab
            entity={brand}
            fields={['name', 'slug']}
            productCount={brand.product_count}
            description={brand.description}
          />
        );
      case 'images':
        return (
          <ImagesTab
            entity={brand}
            entityId={id}
            entityType="brand"
            galleryMode={false}
            onUploadImage={handleUploadImage}
            onDeleteImage={handleDeleteImage}
            isLoading={loading}
            error={error}
          />
        );
      case 'woocommerce':
        return <WooCommerceTab entity={brand} entityType="brand" onSync={handleSync} />;
      default:
        return null;
    }
  };

  return (
    <EntityDetail
      entity={brand}
      entityId={id}
      entityName="marque"
      entityNamePlural="marques"
      baseRoute="/products/brands"
      tabs={ENTITY_CONFIG.tabs}
      renderTabContent={renderTabContent}
      actions={['edit', 'delete']}
      syncEnabled={ENTITY_CONFIG.syncEnabled}
      onDelete={deleteBrand}
      onSync={handleSync}
      isLoading={loading}
      error={error}
    />
  );
}

export default BrandDetail;
