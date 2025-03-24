// src/hooks/useEntityDetailWithPreferences.js
import { useEffect } from 'react';
import { useEntityDetail } from '@/hooks/useEntityDetail';

/**
 * Hook combinant useEntityDetail avec les préférences utilisateur
 * pour les vues détaillées d'entité
 */
export function useEntityDetailWithPreferences({
  id,
  entityType,
  entityStore,
  preferencesStore,
  deleteEntityFn,
  uploadImageFn = null,
  deleteImageFn = null,
  syncEntityFn = null,
}) {
  // Récupérer les données et fonctions du store
  const { getEntityById, deleteEntity, uploadImage, deleteImage, syncEntity, wsStore } =
    entityStore;

  // Récupérer les préférences
  const {
    preferences: detailPreferences,
    setActiveTab,
    setScrollPosition,
    toggleSection,
    addToLastViewedItems,
  } = preferencesStore;

  // Utiliser le hook useEntityDetail
  const { entity, loading, error, handleSync, handleUploadImage, handleDeleteImage } =
    useEntityDetail({
      id,
      entityType,
      getEntityById,
      wsStore,
      deleteEntity: deleteEntityFn || deleteEntity,
      uploadImage: uploadImageFn || uploadImage,
      deleteImage: deleteImageFn || deleteImage,
      syncEntity: syncEntityFn || syncEntity,
    });

  // Ajouter l'élément à la liste des derniers consultés
  useEffect(() => {
    if (id && !loading && entity) {
      addToLastViewedItems(id);
    }
  }, [id, loading, entity, addToLastViewedItems]);

  // Restaurer la position de défilement
  useEffect(() => {
    if (detailPreferences.scrollPosition > 0 && !loading && entity) {
      window.scrollTo(0, detailPreferences.scrollPosition);
    }
  }, [detailPreferences.scrollPosition, loading, entity]);

  // Gestionnaires pour les préférences
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
  };

  const handleSectionToggle = (sectionId) => {
    toggleSection(sectionId);
  };

  const handleScroll = () => {
    // Mettre à jour la position de défilement (avec debounce si nécessaire)
    setScrollPosition(window.scrollY);
  };

  // Ajouter un écouteur d'événement pour le défilement
  useEffect(() => {
    if (entity) {
      const scrollListener = () => {
        // Vous pouvez ajouter un debounce ici si nécessaire
        handleScroll();
      };

      window.addEventListener('scroll', scrollListener);
      return () => {
        window.removeEventListener('scroll', scrollListener);
      };
    }
  }, [entity]);

  return {
    entity,
    detailPreferences,
    loading,
    error,
    handleSync,
    handleUploadImage,
    handleDeleteImage,
    handleTabChange,
    handleSectionToggle,
    recentlyViewed: detailPreferences.lastViewedItems,
  };
}
