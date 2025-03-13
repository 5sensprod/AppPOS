// src/services/imageProxyService.js
class ImageProxyService {
  constructor() {
    this.apiBaseUrl = null;
  }

  initialize(apiBaseUrl) {
    this.apiBaseUrl = apiBaseUrl;
    console.log("✅ Service de proxy d'images initialisé avec:", apiBaseUrl);
  }

  getImageUrl(imagePath = '') {
    if (!this.apiBaseUrl) {
      console.warn("⚠️ Service de proxy d'images non initialisé");
      return imagePath;
    }

    try {
      return new URL(imagePath, this.apiBaseUrl).href;
    } catch {
      return `${this.apiBaseUrl}/public/default/no-image.jpg`;
    }
  }

  getProductImageUrl(product) {
    return this.getImageUrl(product?.image?.src);
  }

  getProductGalleryUrls(product) {
    return product?.gallery_images?.map((img) => this.getImageUrl(img.src)) || [];
  }
}

// Exporter une instance unique
export default new ImageProxyService();
