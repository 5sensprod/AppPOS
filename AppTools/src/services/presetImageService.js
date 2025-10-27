// AppTools/src/services/presetImageService.js - VERSION CORRIGÉE
import apiService from './api';

class PresetImageService {
  constructor() {
    this.baseUrl = '/api/presets/images';
  }

  /**
   * 📤 Upload une ou plusieurs images
   */
  async uploadImages(files) {
    try {
      const formData = new FormData();

      const fileArray = Array.isArray(files) ? files : [files];

      fileArray.forEach((file) => {
        formData.append('images', file);
      });

      const response = await apiService.post(`${this.baseUrl}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('✅ Images uploadées:', response.data);

      // ✅ NOUVEAU : Normaliser les URLs des images uploadées
      const data = response.data?.data || response.data;
      if (data.images && Array.isArray(data.images)) {
        data.images = data.images.map((img) => ({
          ...img,
          src: this.getImageUrl(img.src),
        }));
      }

      return data;
    } catch (error) {
      console.error('❌ Erreur upload images:', error);
      throw error;
    }
  }

  /**
   * 📋 Récupère la liste de toutes les images
   */
  async listImages() {
    try {
      const response = await apiService.get(this.baseUrl);
      const data = response.data?.data || response.data;
      const images = data.images || [];

      // ✅ NOUVEAU : Normaliser toutes les URLs
      return images.map((img) => ({
        ...img,
        src: this.getImageUrl(img.src),
      }));
    } catch (error) {
      console.error('❌ Erreur liste images:', error);
      return [];
    }
  }

  /**
   * 🔍 Récupère les infos d'une image spécifique
   */
  async getImageInfo(filename) {
    try {
      const response = await apiService.get(`${this.baseUrl}/${filename}`);
      const data = response.data?.data || response.data;

      // ✅ NOUVEAU : Normaliser l'URL
      if (data && data.src) {
        data.src = this.getImageUrl(data.src);
      }

      return data;
    } catch (error) {
      console.error('❌ Erreur info image:', error);
      return null;
    }
  }

  /**
   * 🗑️ Supprime une image
   */
  async deleteImage(filename) {
    try {
      await apiService.delete(`${this.baseUrl}/${filename}`);
      console.log('✅ Image supprimée:', filename);
      return true;
    } catch (error) {
      console.error('❌ Erreur suppression image:', error);
      throw error;
    }
  }

  /**
   * 🧹 Nettoie les images orphelines (admin uniquement)
   */
  async cleanupOrphanImages() {
    try {
      const response = await apiService.post(`${this.baseUrl}/cleanup`);
      console.log('✅ Nettoyage effectué:', response.data);
      return response.data?.data || response.data;
    } catch (error) {
      console.error('❌ Erreur nettoyage:', error);
      throw error;
    }
  }

  /**
   * ✅ CORRIGÉ : Construit TOUJOURS une URL HTTP complète
   * Convertit les chemins serveur (/public/...) en URLs HTTP accessibles
   */
  getImageUrl(src) {
    if (!src) return null;

    // ✅ Si c'est déjà une URL complète, retourner tel quel
    if (src.startsWith('http://') || src.startsWith('https://')) {
      return src;
    }

    const baseUrl = apiService.getBaseUrl();
    if (!baseUrl) {
      console.error('❌ [IMAGE] API baseUrl non disponible !');
      return null;
    }

    // ✅ NOUVEAU : Gestion des différents formats de chemins serveur

    // Format 1 : /public/products/xxx/image.jpg (chemin absolu serveur)
    if (src.startsWith('/public/')) {
      return `${baseUrl}${src}`;
    }

    // Format 2 : public/products/xxx/image.jpg (chemin relatif serveur)
    if (src.startsWith('public/')) {
      return `${baseUrl}/${src}`;
    }

    // Format 3 : /products/xxx/image.jpg (sans le préfixe public)
    if (
      src.startsWith('/products/') ||
      src.startsWith('/categories/') ||
      src.startsWith('/brands/')
    ) {
      return `${baseUrl}/public${src}`;
    }

    // Format 4 : products/xxx/image.jpg (relatif sans /)
    if (src.match(/^(products|categories|brands)\//)) {
      return `${baseUrl}/public/${src}`;
    }

    // Format 5 : Chemin préfixé par / (autre)
    if (src.startsWith('/')) {
      return `${baseUrl}${src}`;
    }

    // Format 6 : Fallback générique
    return `${baseUrl}/public/${src}`;
  }

  /**
   * ✅ NOUVEAU : Normalise un objet produit avec ses images
   * Utilisé pour normaliser les produits reçus de l'API
   */
  normalizeProductImages(product) {
    if (!product) return product;

    const normalized = { ...product };

    // Image principale
    if (normalized.image?.src) {
      normalized.image.src = this.getImageUrl(normalized.image.src);
    }

    // Galerie d'images
    if (Array.isArray(normalized.gallery_images)) {
      normalized.gallery_images = normalized.gallery_images.map((img) => ({
        ...img,
        src: img.src ? this.getImageUrl(img.src) : img.src,
      }));
    }

    return normalized;
  }
}

export default new PresetImageService();
