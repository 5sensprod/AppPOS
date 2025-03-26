// src/hooks/useEntityForm.js
import { useState, useEffect } from 'react';

/**
 * Hook personnalisé pour gérer les formulaires d'entités
 * Similaire à useEntityDetail, mais adapté pour les formulaires
 *
 * @param {Object} options - Options de configuration
 * @param {string} options.id - ID de l'entité (null pour création)
 * @param {string} options.entityType - Type d'entité (ex: 'brand', 'category', 'product', 'supplier')
 * @param {Function} options.getEntityById - Fonction pour récupérer l'entité par son ID
 * @param {Function} options.createEntity - Fonction pour créer une nouvelle entité
 * @param {Function} options.updateEntity - Fonction pour mettre à jour une entité existante
 * @param {Function} options.uploadImage - Fonction pour téléverser une image (optionnelle)
 * @param {Function} options.deleteImage - Fonction pour supprimer une image (optionnelle)
 * @param {Function} options.uploadGalleryImage - Fonction pour téléverser une image de galerie (optionnelle)
 * @param {Function} options.deleteGalleryImage - Fonction pour supprimer une image de galerie (optionnelle)
 * @param {Object} options.defaultValues - Valeurs par défaut pour un nouvel objet
 * @param {Function} options.formatData - Fonction pour formater les données avant soumission (optionnelle)
 *
 * @returns {Object} - État et gestionnaires pour le formulaire d'entité
 */
export function useEntityForm({
  id,
  entityType,
  getEntityById,
  createEntity,
  updateEntity,
  uploadImage,
  deleteImage,
  uploadGalleryImage,
  deleteGalleryImage,
  defaultValues = {},
  formatData,
}) {
  const [entity, setEntity] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const isNew = !id;

  // Charger les données de l'entité si on est en mode édition
  useEffect(() => {
    if (!id) return;

    setLoading(true);
    getEntityById(id)
      .then((data) => {
        setEntity(data);
        setError(null);
      })
      .catch((err) => {
        console.error(`Erreur lors du chargement ${entityType}:`, err);
        setError(`Erreur lors du chargement ${entityType}.`);
      })
      .finally(() => setLoading(false));
  }, [id, getEntityById, entityType]);

  // Obtenir les valeurs initiales pour le formulaire
  const getInitialValues = () => {
    if (isNew) {
      return defaultValues;
    }
    return entity || {};
  };

  // Gérer la soumission du formulaire
  const handleSubmit = async (data) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Formater les données si nécessaire
      const formattedData = formatData ? formatData(data) : data;

      let result;
      if (isNew) {
        result = await createEntity(formattedData);
        setSuccess(`${entityType} créé avec succès`);
      } else {
        result = await updateEntity(id, formattedData);
        setSuccess(`${entityType} mis à jour avec succès`);

        // Recharger l'entité après mise à jour
        const updatedEntity = await getEntityById(id);
        setEntity(updatedEntity);
      }

      return { success: true, data: formattedData, result };
    } catch (err) {
      console.error(`Erreur lors de la sauvegarde ${entityType}:`, err);

      // Gestion détaillée des erreurs
      if (err.response) {
        const errorMessage =
          err.response.data?.error || `Problème lors de la sauvegarde ${entityType}`;
        setError(`Erreur: ${errorMessage}`);
      } else {
        setError(`Erreur lors de la sauvegarde ${entityType}. Veuillez réessayer.`);
      }

      return { success: false, error: err };
    } finally {
      setLoading(false);
    }
  };

  // Gérer le téléversement d'image
  const handleUploadImage = async (entityId, file, isGallery = false) => {
    try {
      setLoading(true);
      setError(null);

      if (isGallery && uploadGalleryImage) {
        await uploadGalleryImage(entityId, file);
      } else if (uploadImage) {
        await uploadImage(entityId, file);
      } else {
        console.warn('Fonction uploadImage non disponible');
        return false;
      }

      // Recharger l'entité après le téléversement
      if (id) {
        const updatedEntity = await getEntityById(id);
        setEntity(updatedEntity);
      }

      return true;
    } catch (err) {
      console.error("Erreur lors de l'upload d'image:", err);
      setError("Erreur lors de l'upload d'image");
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Gérer la suppression d'image
  const handleDeleteImage = async (entityId, imageIndex, isGallery = false) => {
    try {
      setLoading(true);
      setError(null);

      if (isGallery && deleteGalleryImage) {
        await deleteGalleryImage(entityId, imageIndex);
      } else if (deleteImage) {
        await deleteImage(entityId);
      } else {
        console.warn('Fonction deleteImage non disponible');
        return false;
      }

      // Recharger l'entité après la suppression
      if (id) {
        const updatedEntity = await getEntityById(id);
        setEntity(updatedEntity);
      }

      return true;
    } catch (err) {
      console.error("Erreur lors de la suppression d'image:", err);
      setError("Erreur lors de la suppression d'image");
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Réinitialiser les messages d'erreur et de succès
  const resetMessages = () => {
    setError(null);
    setSuccess(null);
  };

  return {
    entity,
    loading,
    error,
    success,
    isNew,
    setError,
    setSuccess,
    resetMessages,
    getInitialValues,
    handleSubmit,
    handleUploadImage,
    handleDeleteImage,
  };
}
