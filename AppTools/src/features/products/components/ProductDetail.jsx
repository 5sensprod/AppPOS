// src/features/products/components/ProductDetail.jsx
import React from 'react';
import { useParams } from 'react-router-dom';
import {
  useProduct,
  useProductExtras,
  useProductDataStore,
  useProductDetailPreferences,
} from '../stores/productStore';
import { EntityDetail } from '../../../components/common';
import GeneralInfoTab from '../../../components/common/tabs/GeneralInfoTab';
import InventoryTab from './tabs/InventoryTab';
import ImagesTab from '../../../components/common/tabs/ImagesTab';
import WooCommerceTab from '../../../components/common/tabs/WooCommerceTab';
import ProductPriceSection from './ProductPriceSection';
import { ENTITY_CONFIG } from '../constants';
import { useEntityDetailWithPreferences } from '../../../hooks/useEntityDetailWithPreferences';

function ProductDetail() {
  const { id } = useParams();
  const { getProductById, deleteProduct, syncProduct, updateProduct } = useProduct();
  const { uploadGalleryImage, deleteGalleryImage, setMainImage } = useProductExtras();
  const productDataStore = useProductDataStore();
  const productDetailPreferences = useProductDetailPreferences();

  // Utiliser notre hook combiné avec préférences
  const {
    entity: product,
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
    entityType: 'product',
    entityStore: {
      getEntityById: getProductById,
      deleteEntity: deleteProduct,
      syncEntity: syncProduct,
      uploadImage: uploadGalleryImage,
      deleteImage: deleteGalleryImage,
      wsStore: productDataStore,
    },
    preferencesStore: productDetailPreferences,
  });

  // Fonction spécifique pour gérer l'image principale
  const handleSetMainImage = async (productId, imageIndex) => {
    try {
      await setMainImage(productId, imageIndex);
    } catch (error) {
      console.error("Erreur lors de la définition de l'image principale:", error);
    }
  };

  // Fonction de mise à jour du produit
  const handleUpdate = async (productId, data) => {
    try {
      return await updateProduct(productId, data);
    } catch (error) {
      console.error('Erreur lors de la mise à jour du produit:', error);
      throw error;
    }
  };

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

  // Affichage des éléments récemment consultés
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
        // Nouvelles props pour les préférences
        activeTab={detailPreferences.activeTab}
        onTabChange={handleTabChange}
      />
      {renderRecentlyViewed()}
    </>
  );
}

export default ProductDetail;
