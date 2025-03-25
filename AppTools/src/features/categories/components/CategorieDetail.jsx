// src/features/categories/components/CategoryDetail.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useCategory, useCategoryExtras } from '../stores/categoryStore';
import { useCategoryHierarchyStore } from '../stores/categoryHierarchyStore';
import { EntityDetail } from '../../../components/common';
import GeneralInfoTab from '../../../components/common/tabs/GeneralInfoTab';
import ImagesTab from '../../../components/common/tabs/ImagesTab';
import WooCommerceTab from '../../../components/common/tabs/WooCommerceTab';
import { ENTITY_CONFIG } from '../constants';
import { useEntityDetail } from '../../../hooks/useEntityDetail';

function CategoryDetail() {
  const { id } = useParams();
  const [wsInitialized, setWsInitialized] = useState(false);
  const isMountedRef = useRef(true);

  // Récupération des fonctions du store
  const { getCategoryById, deleteCategory, syncCategory } = useCategory();
  const { uploadImage, deleteImage } = useCategoryExtras();

  // Accès direct au store hiérarchique
  const hierarchyStore = useCategoryHierarchyStore();

  // Initialiser WebSocket séparément, une seule fois
  useEffect(() => {
    if (!wsInitialized) {
      console.log(`[CATEGORY_DETAIL] Initialisation des WebSockets pour la catégorie #${id}`);
      const cleanup = hierarchyStore.initWebSocket();
      setWsInitialized(true);

      return () => {
        if (typeof cleanup === 'function') {
          cleanup();
        }
      };
    }
  }, [id, hierarchyStore, wsInitialized]);

  // Nettoyage à la déconnexion
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Utilisation du hook useEntityDetail sans passer le store WebSocket
  // puisque nous l'initialisons directement ci-dessus
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

  const renderTabContent = (category, activeTab) => {
    if (!category) return null;

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
