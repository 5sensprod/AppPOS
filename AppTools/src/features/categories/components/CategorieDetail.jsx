// src/features/categories/components/CategoryDetail.jsx
import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  useCategory,
  useCategoryExtras,
  useCategoryDetailPreferences,
} from '../stores/categoryStore';
import { useCategoryHierarchyStore } from '../stores/categoryHierarchyStore';
import { EntityDetail } from '../../../components/common';
import GeneralInfoTab from '../../../components/common/tabs/GeneralInfoTab';
import ImagesTab from '../../../components/common/tabs/ImagesTab';
import WooCommerceTab from '../../../components/common/tabs/WooCommerceTab';
// import HierarchyTab from './HierarchyTab'; // À implémenter si nécessaire
import { ENTITY_CONFIG } from '../constants';
import { useEntityDetailWithPreferences } from '../../../hooks/useEntityDetailWithPreferences';

function CategoryDetail() {
  const { id } = useParams();
  const { getCategoryById, deleteCategory } = useCategory();
  const { uploadImage, deleteImage, syncCategory } = useCategoryExtras();

  // Store WebSocket dédié
  const categoryWsStore = useCategoryHierarchyStore();
  const categoryDetailPreferences = useCategoryDetailPreferences();

  // Utiliser le hook combiné
  const {
    entity: category,
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
    entityType: 'category',
    entityStore: {
      getEntityById: getCategoryById,
      deleteEntity: deleteCategory,
      uploadImage,
      deleteImage,
      syncEntity: syncCategory,
      wsStore: categoryWsStore,
    },
    preferencesStore: categoryDetailPreferences,
  });

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
      // case 'hierarchy':
      //   // Si vous avez un onglet hiérarchie, vous pouvez l'ajouter ici
      //   // et utiliser la logique d'expansion des catégories
      //   return (
      //     <HierarchyTab
      //       category={category}
      //       expandedCategories={detailPreferences.expandedCategories || {}}
      //       onToggleExpand={toggleCategoryExpand}
      //     />
      //   );
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
        // Nouvelles props pour les préférences
        activeTab={detailPreferences.activeTab}
        onTabChange={handleTabChange}
      />
      {renderRecentlyViewed()}
    </>
  );
}

export default CategoryDetail;
