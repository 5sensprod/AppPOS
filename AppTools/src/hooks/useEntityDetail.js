// src/hooks/useEntityDetail.js
import { useState, useEffect } from 'react';

/**
 * Hook personnalisé pour gérer les détails d'une entité
 * Compatible avec Zustand et WebSocket
 *
 * @param {Object} options - Options de configuration
 * @param {string} options.id - ID de l'entité
 * @param {string} options.entityType - Type d'entité (ex: 'brand', 'category', 'product')
 * @param {Function} options.getEntityById - Fonction pour récupérer l'entité par son ID
 * @param {Object} options.wsStore - Store WebSocket Zustand pour cette entité
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
  wsStore,
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

  // Initialiser WebSocket et charger l'entité
  useEffect(() => {
    if (!id) return;

    let cleanup = () => {};

    // Initialiser WebSocket si le store est fourni
    if (wsStore && wsStore.initWebSocket) {
      console.log(`[DETAIL] Initialisation WebSocket pour ${entityType} #${id}`);
      cleanup = wsStore.initWebSocket();
    }

    // Charger les données initiales
    setLoading(true);
    getEntityById(id)
      .then(setEntity)
      .catch((err) => {
        console.error(`Erreur lors de la récupération de ${entityType}:`, err);
        setError(`Erreur lors de la récupération de ${entityType}.`);
      })
      .finally(() => setLoading(false));

    return cleanup;
  }, [id, getEntityById, entityType, wsStore]);

  // Gérer la synchronisation de l'entité
  const handleSync = async (entityId) => {
    if (!syncEntity) return null;

    try {
      setLoading(true);
      await syncEntity(entityId);
      const updatedEntity = await getEntityById(id);
      setEntity(updatedEntity);
      return updatedEntity;
    } catch (error) {
      console.error(`Erreur lors de la synchronisation de ${entityType}:`, error);
      setError(`Erreur lors de la synchronisation.`);
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
      await updateEntity(entityId, updatedData);
      const updatedEntity = await getEntityById(id);
      setEntity(updatedEntity);
      return true;
    } catch (error) {
      console.error(`Erreur lors de la mise à jour de ${entityType}:`, error);
      setError(`Erreur lors de la mise à jour.`);
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
        await uploadGalleryImage(entityId, file);
      } else if (uploadImage) {
        await uploadImage(entityId, file);
      } else {
        console.warn('Fonction uploadImage non disponible');
        return false;
      }

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
        await deleteGalleryImage(entityId, imageIndex);
      } else if (deleteImage) {
        await deleteImage(entityId);
      } else {
        console.warn('Fonction deleteImage non disponible');
        return false;
      }

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
      await setMainImage(entityId, imageIndex);
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
