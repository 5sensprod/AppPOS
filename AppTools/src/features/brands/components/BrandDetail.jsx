// AppTools\src\features\brands\components\BrandDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useBrand, useBrandExtras } from '../contexts/brandContext';
import { EntityDetail } from '../../../components/common';
import GeneralInfoTab from '../../../components/common/tabs/GeneralInfoTab';
import ImagesTab from '../../../components/common/tabs/ImagesTab';
import WooCommerceTab from '../../../components/common/tabs/WooCommerceTab';
import { ENTITY_CONFIG } from '../constants';
import { useEntityEvents } from '../../../hooks/useEntityEvents';

function BrandDetail() {
  const { id } = useParams();
  const { getBrandById, deleteBrand } = useBrand();
  const { uploadImage, deleteImage, syncBrand } = useBrandExtras();

  const [brand, setBrand] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Charger les données de la marque
  useEffect(() => {
    if (!id) return;

    setLoading(true);
    getBrandById(id)
      .then(setBrand)
      .catch(() => setError('Erreur lors de la récupération de la marque.'))
      .finally(() => setLoading(false));
  }, [id, getBrandById]);

  useEntityEvents('brand', {
    onUpdated: ({ entityId, data }) => {
      if (entityId === id && data) {
        setBrand(data);
      }
    },
    customEvents: {
      // Le hook gère automatiquement l'abonnement sur les reconnexions,
      // donc vous n'avez pas besoin de gérer l'événement 'connect' explicitement
    },
  });

  // Gérer la synchronisation de la marque
  const handleSync = async (brandId) => {
    try {
      setLoading(true);
      await syncBrand(brandId);
      // Recharger la marque pour obtenir les données à jour
      const updatedBrand = await getBrandById(id);
      setBrand(updatedBrand);
      return updatedBrand;
    } catch (error) {
      console.error('Erreur lors de la synchronisation de la marque:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Gestionnaires pour les images
  const handleUploadImage = async (brandId, file) => {
    try {
      setLoading(true);
      await uploadImage(brandId, file);
      // Recharger la marque pour avoir les dernières images
      const updatedBrand = await getBrandById(id);
      setBrand(updatedBrand);
      return true;
    } catch (error) {
      console.error("Erreur lors de l'upload d'image:", error);
      setError("Erreur lors de l'upload d'image");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteImage = async (brandId) => {
    try {
      setLoading(true);
      await deleteImage(brandId);
      // Recharger la marque pour avoir les dernières images
      const updatedBrand = await getBrandById(id);
      setBrand(updatedBrand);
      return true;
    } catch (error) {
      console.error("Erreur lors de la suppression d'image:", error);
      setError("Erreur lors de la suppression d'image");
      throw error;
    } finally {
      setLoading(false);
    }
  };

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
