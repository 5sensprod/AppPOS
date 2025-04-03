// src/factories/createEntityImageHandlers.js
import apiService from '../services/api';

export function createEntityImageHandlers(entityName, apiEndpoint, dispatch, ACTIONS) {
  const getImageFieldName = () => {
    // Pour les produits, utiliser 'images'
    if (entityName === 'product') {
      return 'images';
    }
    // Pour les autres entités (comme supplier), utiliser 'image'
    return 'image';
  };

  const uploadImage = async (id, imageFile) => {
    dispatch({ type: ACTIONS.FETCH_START });
    try {
      const formData = new FormData();
      const fieldName = getImageFieldName();
      console.log(`Utilisation du champ '${fieldName}' pour l'entité ${entityName}`);

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
