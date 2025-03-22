// src/hooks/useEntityDetail.js
import { useState, useEffect } from 'react';
import { useEntityEvents } from './useEntityEvents';

/**
 * Hook personnalisé pour gérer les détails d'une entité
 * Compatible avec Zustand
 *
 * @param {Object} options - Options de configuration
 * @param {string} options.id - ID de l'entité
 * @param {string} options.entityType - Type d'entité (ex: 'brand', 'category', 'product')
 * @param {Function} options.getEntityById - Fonction pour récupérer l'entité par son ID
 * @param {Function} options.syncEntity - Fonction pour synchroniser l'entité (optionnelle)
 * @param {Function} options.uploadImage - Fonction pour téléverser une image (optionnelle)
 * @param {Function} options.deleteImage - Fonction pour supprimer une image (optionnelle)
 * @param {Function} options.uploadGalleryImage - Fonction pour téléverser une image de galerie (optionnelle)
 * @param {Function} options.deleteGalleryImage - Fonction pour supprimer une image de galerie (optionnelle)
 * @param {Function} options.setMainImage - Fonction pour définir l'image principale (optionnelle)
 * @param {Function} options.updateEntity - Fonction pour mettre à jour l'entité (optionnelle)
 *
 * @returns {Object} - État et gestionnaires pour l'entité
 */
export function useEntityDetail({
  id,
  entityType,
  getEntityById,
  syncEntity,
  uploadImage,
  deleteImage,
  uploadGalleryImage,
  deleteGalleryImage,
  setMainImage,
  updateEntity,
}) {
  const [entity, setEntity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Charger les données de l'entité
  useEffect(() => {
    if (!id) return;

    setLoading(true);
    getEntityById(id)
      .then(setEntity)
      .catch(() => setError(`Erreur lors de la récupération de ${entityType}.`))
      .finally(() => setLoading(false));
  }, [id, getEntityById, entityType]);

  // S'abonner aux événements de mise à jour
  useEntityEvents(entityType, {
    onUpdated: ({ entityId, data }) => {
      if (entityId === id && data) {
        setEntity(data);
      }
    },
  });

  // Gérer la synchronisation de l'entité
  const handleSync = async (entityId) => {
    if (!syncEntity) return null;

    try {
      setLoading(true);
      // Avec Zustand, la synchronisation met à jour le store automatiquement
      await syncEntity(entityId);
      // Mais on recharge quand même l'entité pour notre état local
      const updatedEntity = await getEntityById(id);
      setEntity(updatedEntity);
      return updatedEntity;
    } catch (error) {
      console.error(`Erreur lors de la synchronisation de ${entityType}:`, error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Gérer la mise à jour de l'entité
  const handleUpdate = async (entityId, updatedData) => {
    if (!updateEntity) return null;

    try {
      setLoading(true);
      // Avec Zustand, la mise à jour met à jour le store automatiquement
      await updateEntity(entityId, updatedData);
      // Mais on recharge quand même l'entité pour notre état local
      const updatedEntity = await getEntityById(id);
      setEntity(updatedEntity);
      return true;
    } catch (error) {
      console.error(`Erreur lors de la mise à jour de ${entityType}:`, error);
      setError(`Erreur lors de la mise à jour de ${entityType}.`);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Gérer le téléversement d'image
  const handleUploadImage = async (entityId, file, isGallery = false) => {
    try {
      setLoading(true);
      if (isGallery && uploadGalleryImage) {
        // Avec Zustand, le téléversement met à jour le store automatiquement
        await uploadGalleryImage(entityId, file);
      } else if (uploadImage) {
        // Avec Zustand, le téléversement met à jour le store automatiquement
        await uploadImage(entityId, file);
      } else {
        console.warn('Fonction uploadImage non disponible');
        return false;
      }

      // Mais on recharge quand même l'entité pour notre état local
      const updatedEntity = await getEntityById(id);
      setEntity(updatedEntity);
      return true;
    } catch (error) {
      console.error("Erreur lors de l'upload d'image:", error);
      setError("Erreur lors de l'upload d'image");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Gérer la suppression d'image
  const handleDeleteImage = async (entityId, imageIndex, isGallery = false) => {
    try {
      setLoading(true);
      if (isGallery && deleteGalleryImage) {
        // Avec Zustand, la suppression met à jour le store automatiquement
        await deleteGalleryImage(entityId, imageIndex);
      } else if (deleteImage) {
        // Avec Zustand, la suppression met à jour le store automatiquement
        await deleteImage(entityId);
      } else {
        console.warn('Fonction deleteImage non disponible');
        return false;
      }

      // Mais on recharge quand même l'entité pour notre état local
      const updatedEntity = await getEntityById(id);
      setEntity(updatedEntity);
      return true;
    } catch (error) {
      console.error("Erreur lors de la suppression d'image:", error);
      setError("Erreur lors de la suppression d'image");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Gérer la définition de l'image principale
  const handleSetMainImage = async (entityId, imageIndex) => {
    if (!setMainImage) return false;

    try {
      setLoading(true);
      // Avec Zustand, la définition de l'image principale met à jour le store automatiquement
      await setMainImage(entityId, imageIndex);
      // Mais on recharge quand même l'entité pour notre état local
      const updatedEntity = await getEntityById(id);
      setEntity(updatedEntity);
      return true;
    } catch (error) {
      console.error("Erreur lors de la définition de l'image principale:", error);
      setError("Erreur lors de la définition de l'image principale");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    entity,
    loading,
    error,
    setError,
    handleSync,
    handleUpdate,
    handleUploadImage,
    handleDeleteImage,
    handleSetMainImage,
  };
}
