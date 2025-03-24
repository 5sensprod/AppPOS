// src/features/brands/components/BrandDetail.jsx
import React from 'react';
import { useParams } from 'react-router-dom';
import { useBrand, useBrandExtras } from '../stores/brandStore';
import { useBrandHierarchyStore } from '../stores/brandStore';
import { EntityDetail } from '../../../components/common';
import GeneralInfoTab from '../../../components/common/tabs/GeneralInfoTab';
import ImagesTab from '../../../components/common/tabs/ImagesTab';
import WooCommerceTab from '../../../components/common/tabs/WooCommerceTab';
import { ENTITY_CONFIG } from '../constants';
import { useEntityDetail } from '../../../hooks/useEntityDetail';

function BrandDetail() {
  const { id } = useParams();
  const { getBrandById, deleteBrand } = useBrand();
  const { uploadImage, deleteImage, syncBrand } = useBrandExtras();

  // Store WebSocket dédié
  const brandWsStore = useBrandHierarchyStore();

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
    wsStore: brandWsStore,
    syncEntity: syncBrand,
    uploadImage,
    deleteImage,
  });

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
