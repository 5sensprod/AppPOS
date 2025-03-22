// AppTools\src\features\categories\components\CategoryDetail.jsx
import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useCategory, useCategoryExtras } from '../stores/categoryStore'; // Import depuis le store Zustand
import { EntityDetail } from '../../../components/common';
import GeneralInfoTab from '../../../components/common/tabs/GeneralInfoTab';
import ImagesTab from '../../../components/common/tabs/ImagesTab';
import WooCommerceTab from '../../../components/common/tabs/WooCommerceTab';
import { ENTITY_CONFIG } from '../constants';
import { useEntityDetail } from '../../../hooks/useEntityDetail';

function CategoryDetail() {
  const { id } = useParams();
  const { getCategoryById, deleteCategory, initWebSocketListeners } = useCategory();

  const { uploadImage, deleteImage, syncCategory } = useCategoryExtras();

  // Initialiser les écouteurs WebSocket au montage du composant
  useEffect(() => {
    const cleanup = initWebSocketListeners();
    return cleanup;
  }, [initWebSocketListeners]);

  // Utiliser le hook personnalisé pour gérer les détails de la catégorie
  const {
    entity: category,
    loading,
    error,
    handleSync,
    handleUploadImage,
    handleDeleteImage,
  } = useEntityDetail({
    id,
    entityType: 'category',
    getEntityById: getCategoryById,
    syncEntity: syncCategory,
    uploadImage,
    deleteImage,
  });

  // Rendu du contenu des onglets avec les composants réutilisables
  const renderTabContent = (category, activeTab) => {
    switch (activeTab) {
      case 'general':
        return (
          <GeneralInfoTab
            entity={category}
            fields={['name', 'parent_id']}
            productCount={category.product_count}
            description={category.description}
          />
        );

      case 'images':
        return (
          <ImagesTab
            entity={category}
            entityId={id}
            entityType="category"
            galleryMode={false}
            onUploadImage={handleUploadImage}
            onDeleteImage={handleDeleteImage}
            isLoading={loading}
            error={error}
          />
        );

      case 'woocommerce':
        return <WooCommerceTab entity={category} entityType="category" onSync={handleSync} />;

      default:
        return null;
    }
  };

  return (
    <EntityDetail
      entity={category}
      entityId={id}
      entityName="catégorie"
      entityNamePlural="catégories"
      baseRoute="/products/categories"
      tabs={ENTITY_CONFIG.tabs}
      renderTabContent={renderTabContent}
      actions={['edit', 'delete']}
      syncEnabled={ENTITY_CONFIG.syncEnabled}
      onDelete={deleteCategory}
      onSync={handleSync}
      isLoading={loading}
      error={error}
    />
  );
}

export default CategoryDetail;
