// src/services/imageProxyService.js
import apiService from './api';

/**
 * Service pour gérer la récupération et le proxy d'images depuis l'API
 */
class ImageProxyService {
  constructor() {
    this.apiBaseUrl = null;
    this.initialized = false;
  }

  /**
   * Initialise le service avec l'URL de base de l'API
   * @param {string} apiBaseUrl - URL de base de l'API
   */
  initialize(apiBaseUrl) {
    this.apiBaseUrl = apiBaseUrl;
    this.initialized = true;
    console.log("Service de proxy d'images initialisé avec l'URL:", apiBaseUrl);
  }

  /**
   * Convertit un chemin d'image local en URL d'API
   * @param {string} imagePath - Chemin d'image relatif
   * @returns {string} URL complète de l'image sur l'API
   */
  getImageUrl(imagePath) {
    if (!this.initialized) {
      console.warn("Service de proxy d'images non initialisé");
      return imagePath;
    }

    // Si l'URL est déjà complète (commence par http), la retourner telle quelle
    if (imagePath && (imagePath.startsWith('http://') || imagePath.startsWith('https://'))) {
      return imagePath;
    }

    // Si le chemin est relatif mais ne commence pas par '/'
    if (imagePath && !imagePath.startsWith('/')) {
      imagePath = `/${imagePath}`;
    }

    // Si le chemin est null, undefined ou vide, retourner une image par défaut
    if (!imagePath) {
      return `${this.apiBaseUrl}/public/default/no-image.jpg`;
    }

    // Construire l'URL complète
    return `${this.apiBaseUrl}${imagePath}`;
  }

  /**
   * Fonction utilitaire pour extraire le chemin d'image d'un objet produit
   * @param {Object} product - Objet produit
   * @returns {string} URL de l'image principale
   */
  getProductImageUrl(product) {
    if (!product) return this.getImageUrl(null);

    if (product.image && product.image.src) {
      return this.getImageUrl(product.image.src);
    }

    return this.getImageUrl(null);
  }

  /**
   * Fonction utilitaire pour extraire les chemins d'images de la galerie d'un produit
   * @param {Object} product - Objet produit
   * @returns {Array<string>} Liste des URLs des images de la galerie
   */
  getProductGalleryUrls(product) {
    if (!product || !product.gallery_images || !Array.isArray(product.gallery_images)) {
      return [];
    }

    return product.gallery_images.map((image) => this.getImageUrl(image.src));
  }
}

// Créer et exporter une instance singleton
const imageProxyService = new ImageProxyService();
export default imageProxyService;
