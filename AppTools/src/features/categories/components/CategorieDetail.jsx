// AppTools\src\features\categories\components\CategorieDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useCategory, useCategoryExtras } from '../contexts/categoryContext';
import { EntityDetail } from '../../../components/common';
import GeneralInfoTab from '../../../components/common/tabs/GeneralInfoTab';
import ImagesTab from '../../../components/common/tabs/ImagesTab';
import WooCommerceTab from '../../../components/common/tabs/WooCommerceTab';
import { ENTITY_CONFIG } from '../constants';
import { useEntityEvents } from '../../../hooks/useEntityEvents';

function CategorieDetail() {
  const { id } = useParams();
  const { getCategoryById, deleteCategory } = useCategory();
  const { uploadImage, deleteImage, syncCategory } = useCategoryExtras();

  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Charger les données de la catégorie
  useEffect(() => {
    if (!id) return;

    setLoading(true);
    getCategoryById(id)
      .then(setCategory)
      .catch(() => setError('Erreur lors de la récupération de la catégorie.'))
      .finally(() => setLoading(false));
  }, [id, getCategoryById]);

  useEntityEvents('category', {
    onUpdated: ({ entityId, data }) => {
      if (entityId === id && data) {
        setCategory(data);
      }
    },
    // Le hook gère automatiquement l'abonnement et les reconnexions
  });

  // Gérer la synchronisation de la catégorie
  const handleSync = async (categoryId) => {
    try {
      setLoading(true);
      await syncCategory(categoryId);
      // Recharger la catégorie pour obtenir les données à jour
      const updatedCategory = await getCategoryById(id);
      setCategory(updatedCategory);
      return updatedCategory;
    } catch (error) {
      console.error('Erreur lors de la synchronisation de la catégorie:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Gestionnaires pour les images
  const handleUploadImage = async (categoryId, file) => {
    try {
      setLoading(true);
      await uploadImage(categoryId, file);
      // Recharger la catégorie pour avoir les dernières images
      const updatedCategory = await getCategoryById(id);
      setCategory(updatedCategory);
      return true;
    } catch (error) {
      console.error("Erreur lors de l'upload d'image:", error);
      setError("Erreur lors de l'upload d'image");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteImage = async (categoryId) => {
    try {
      setLoading(true);
      await deleteImage(categoryId);
      // Recharger la catégorie pour avoir les dernières images
      const updatedCategory = await getCategoryById(id);
      setCategory(updatedCategory);
      return true;
    } catch (error) {
      console.error("Erreur lors de la suppression d'image:", error);
      setError("Erreur lors de la suppression d'image");
      throw error;
    } finally {
      setLoading(false);
    }
  };

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

export default CategorieDetail;
