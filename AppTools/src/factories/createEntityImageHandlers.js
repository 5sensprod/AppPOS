// src/factories/entityImageHandlers.js
import apiService from '../services/api';

/**
 * Crée des gestionnaires standard pour les opérations d'images d'entités
 * @param {string} entityName - Nom de l'entité (ex: 'brand', 'category')
 * @param {string} apiEndpoint - Endpoint API de base (ex: '/api/brands')
 * @param {function} dispatch - Fonction dispatch du reducer
 * @param {object} actionTypes - Types d'actions pour le reducer
 */
export function createEntityImageHandlers(entityName, apiEndpoint, dispatch, actionTypes) {
  /**
   * Télécharge une image pour une entité
   * @param {string} entityId - ID de l'entité
   * @param {File} imageFile - Fichier image à télécharger
   */
  const uploadImage = async (entityId, imageFile) => {
    if (!dispatch) return;

    try {
      const formData = new FormData();
      formData.append('image', imageFile);

      const response = await apiService.post(`${apiEndpoint}/${entityId}/image`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      dispatch({
        type: actionTypes.UPLOAD_IMAGE,
        payload: { id: entityId, image: response.data.data.image },
      });

      return response.data;
    } catch (error) {
      console.error(`Erreur lors du téléchargement de l'image pour ${entityName}:`, error);
      throw error;
    }
  };

  /**
   * Supprime l'image d'une entité
   * @param {string} entityId - ID de l'entité
   */
  const deleteImage = async (entityId) => {
    if (!dispatch) return;

    try {
      await apiService.delete(`${apiEndpoint}/${entityId}/image`);

      dispatch({
        type: actionTypes.DELETE_IMAGE,
        payload: { id: entityId },
      });

      return true;
    } catch (error) {
      console.error(`Erreur lors de la suppression de l'image pour ${entityName}:`, error);
      throw error;
    }
  };

  return { uploadImage, deleteImage };
}
