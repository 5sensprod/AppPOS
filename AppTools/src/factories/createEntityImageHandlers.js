// src/factories/createEntityImageHandlers.js
import apiService from '../services/api';

/**
 * Crée des gestionnaires d'images pour une entité
 * Compatible avec Zustand
 *
 * @param {string} entityName - Nom de l'entité
 * @param {string} apiEndpoint - Point de terminaison API pour l'entité
 * @param {function} dispatch - Fonction dispatch pour mettre à jour l'état
 * @param {Object} ACTIONS - Actions disponibles dans le réducteur
 * @returns {Object} - Objet contenant les gestionnaires d'images
 */
export function createEntityImageHandlers(entityName, apiEndpoint, dispatch, ACTIONS) {
  /**
   * Détermine le nom du champ à utiliser pour l'upload d'image
   * @returns {string} - Nom du champ pour le FormData
   */
  const getImageFieldName = () => {
    // Pour les produits, utiliser 'images'
    if (entityName === 'product') {
      return 'images';
    }
    // Pour les autres entités (comme supplier), utiliser 'image'
    return 'image';
  };

  /**
   * Télécharge une image pour une entité
   *
   * @param {string} id - ID de l'entité
   * @param {File} imageFile - Fichier image à télécharger
   * @returns {Promise} - Promesse résolue avec la réponse de l'API
   */
  const uploadImage = async (id, imageFile) => {
    dispatch({ type: ACTIONS.FETCH_START });
    try {
      const formData = new FormData();
      const fieldName = getImageFieldName();

      formData.append(fieldName, imageFile);

      const response = await apiService.post(`${apiEndpoint}/${id}/image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      dispatch({
        type: ACTIONS.UPLOAD_IMAGE,
        payload: { id, image: response.data.data.image },
      });

      return response.data;
    } catch (error) {
      console.error(`Erreur lors de l'upload d'image pour ${entityName}:`, error);
      if (error.response) {
        console.error("Réponse de l'API:", error.response.data);
        console.error('Statut:', error.response.status);
      }
      dispatch({ type: ACTIONS.FETCH_ERROR, payload: error.message });
      throw error;
    }
  };

  /**
   * Supprime une image d'une entité
   *
   * @param {string} id - ID de l'entité
   * @returns {Promise} - Promesse résolue à true si la suppression est réussie
   */
  const deleteImage = async (id) => {
    dispatch({ type: ACTIONS.FETCH_START });
    try {
      await apiService.delete(`${apiEndpoint}/${id}/image`);
      dispatch({ type: ACTIONS.DELETE_IMAGE, payload: { id } });
      return true;
    } catch (error) {
      console.error(`Erreur lors de la suppression d'image pour ${entityName}:`, error);
      dispatch({ type: ACTIONS.FETCH_ERROR, payload: error.message });
      throw error;
    }
  };

  return {
    uploadImage,
    deleteImage,
  };
}
