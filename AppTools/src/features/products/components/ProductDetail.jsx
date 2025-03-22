// src/features/products/components/ProductDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useProduct, useProductExtras } from '../contexts/productContext';
import { EntityDetail } from '../../../components/common';
import GeneralInfoTab from '../../../components/common/tabs/GeneralInfoTab';
import InventoryTab from './tabs/InventoryTab';
import ImagesTab from '../../../components/common/tabs/ImagesTab';
import WooCommerceTab from '../../../components/common/tabs/WooCommerceTab';
import ProductPriceSection from './ProductPriceSection';
import { ENTITY_CONFIG } from '../constants';
import { useEntityEvents } from '../../../hooks/useEntityEvents';

function ProductDetail() {
  const { id } = useParams();
  const { getProductById, deleteProduct, syncProduct, updateProduct } = useProduct();
  const { uploadImage, uploadGalleryImage, deleteImage, deleteGalleryImage, setMainImage } =
    useProductExtras();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Charger les données du produit
  useEffect(() => {
    if (!id) return;

    setLoading(true);
    getProductById(id)
      .then(setProduct)
      .catch(() => setError('Erreur lors de la récupération du produit.'))
      .finally(() => setLoading(false));
  }, [id, getProductById]);

  useEntityEvents('product', {
    onUpdated: ({ entityId, data }) => {
      if (entityId === id && data) {
        setProduct(data);
      }
    },
    // Le hook gère automatiquement l'abonnement et les reconnexions
  });

  // Gérer la synchronisation du produit
  const handleSync = async (productId) => {
    try {
      await syncProduct(productId);
      // Recharger le produit pour obtenir les données à jour
      const updatedProduct = await getProductById(id);
      setProduct(updatedProduct);
    } catch (error) {
      console.error('Erreur lors de la synchronisation du produit:', error);
      throw error;
    }
  };

  // Gérer la mise à jour du produit
  const handleUpdate = async (productId, updatedData) => {
    try {
      setLoading(true);
      await updateProduct(productId, updatedData);
      // Recharger le produit pour obtenir les données à jour
      const updatedProduct = await getProductById(id);
      setProduct(updatedProduct);
      return true;
    } catch (error) {
      console.error('Erreur lors de la mise à jour du produit:', error);
      setError('Erreur lors de la mise à jour du produit.');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Gestionnaires pour les images
  const handleUploadImage = async (productId, file, isGallery = false) => {
    try {
      setLoading(true);
      if (isGallery) {
        await uploadGalleryImage(productId, file);
      } else {
        await uploadImage(productId, file);
      }
      // Recharger le produit pour avoir les dernières images
      const updatedProduct = await getProductById(id);
      setProduct(updatedProduct);
      return true;
    } catch (error) {
      console.error("Erreur lors de l'upload d'image:", error);
      setError("Erreur lors de l'upload d'image");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteImage = async (productId, imageIndex, isGallery = false) => {
    try {
      setLoading(true);
      if (isGallery) {
        await deleteGalleryImage(productId, imageIndex);
      } else {
        await deleteImage(productId);
      }
      // Recharger le produit pour avoir les dernières images
      const updatedProduct = await getProductById(id);
      setProduct(updatedProduct);
      return true;
    } catch (error) {
      console.error("Erreur lors de la suppression d'image:", error);
      setError("Erreur lors de la suppression d'image");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleSetMainImage = async (productId, imageIndex) => {
    try {
      setLoading(true);
      await setMainImage(productId, imageIndex);
      // Recharger le produit pour avoir les dernières images
      const updatedProduct = await getProductById(id);
      setProduct(updatedProduct);
      return true;
    } catch (error) {
      console.error("Erreur lors de la définition de l'image principale:", error);
      setError("Erreur lors de la définition de l'image principale");
      throw error;
    } finally {
      setLoading(false);
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
