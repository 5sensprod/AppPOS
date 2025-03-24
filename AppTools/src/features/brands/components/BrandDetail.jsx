// src/features/brands/components/BrandDetail.jsx
import React from 'react';
import { useParams } from 'react-router-dom';
import {
  useBrand,
  useBrandExtras,
  useBrandDataStore,
  useBrandDetailPreferences,
} from '../stores/brandStore';
import { EntityDetail } from '../../../components/common';
import GeneralInfoTab from '../../../components/common/tabs/GeneralInfoTab';
import ImagesTab from '../../../components/common/tabs/ImagesTab';
import WooCommerceTab from '../../../components/common/tabs/WooCommerceTab';
import { ENTITY_CONFIG } from '../constants';
import { useEntityDetailWithPreferences } from '../../../hooks/useEntityDetailWithPreferences';

function BrandDetail() {
  const { id } = useParams();
  const { getBrandById, deleteBrand } = useBrand();
  const { uploadImage, deleteImage, syncBrand } = useBrandExtras();
  const brandDataStore = useBrandDataStore();
  const brandDetailPreferences = useBrandDetailPreferences();

  // Utiliser notre nouveau hook combiné
  const {
    entity: brand,
    detailPreferences,
    loading,
    error,
    handleSync,
    handleUploadImage,
    handleDeleteImage,
    handleTabChange,
    recentlyViewed,
  } = useEntityDetailWithPreferences({
    id,
    entityType: 'brand',
    entityStore: {
      getEntityById: getBrandById,
      deleteEntity: deleteBrand,
      uploadImage,
      deleteImage,
      syncEntity: syncBrand,
      wsStore: brandDataStore,
    },
    preferencesStore: brandDetailPreferences,
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

  // Si nécessaire, ajouter du contenu supplémentaire pour les éléments récemment consultés
  const renderRecentlyViewed = () => {
    if (recentlyViewed && recentlyViewed.length > 0) {
      return (
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h3 className="text-lg font-medium mb-3">Récemment consultés</h3>
          <div className="flex flex-wrap gap-2">
            {/* Afficher les éléments récemment consultés ici */}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <>
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
        // Nouvelles props pour les préférences
        activeTab={detailPreferences.activeTab}
        onTabChange={handleTabChange}
      />
      {renderRecentlyViewed()}
    </>
  );
}

export default BrandDetail;
