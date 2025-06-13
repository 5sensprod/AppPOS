// src/services/salesService.js
import apiService from './api';

class SalesService {
  constructor() {
    this.baseEndpoint = '/api/sales';
  }

  // Créer une nouvelle vente
  async createSale(saleData) {
    try {
      const response = await apiService.post(this.baseEndpoint, saleData);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la création de la vente:', error);
      throw error;
    }
  }

  // Obtenir l'historique des ventes
  async getSales(params = {}) {
    try {
      const response = await apiService.get(this.baseEndpoint, { params });
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des ventes:', error);
      throw error;
    }
  }

  // Obtenir une vente par ID
  async getSaleById(id) {
    try {
      const response = await apiService.get(`${this.baseEndpoint}/${id}`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération de la vente:', error);
      throw error;
    }
  }

  // Rapport de caisse pour le caissier connecté
  async getCashierReport(date = null) {
    try {
      const params = date ? { date } : {};
      const response = await apiService.get(`${this.baseEndpoint}/cashier/report`, { params });
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération du rapport:', error);
      throw error;
    }
  }

  // Rechercher un produit par code-barres
  async searchProductByBarcode(barcode) {
    try {
      const response = await apiService.get(`/api/products/barcode/${barcode}`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la recherche par code-barres:', error);
      throw error;
    }
  }

  async searchProduct(code, searchType = 'auto') {
    try {
      let endpoint;

      switch (searchType) {
        case 'sku':
          endpoint = `/api/products/sku/${encodeURIComponent(code)}?partial=true`;
          break;
        case 'barcode':
          endpoint = `/api/products/barcode/${encodeURIComponent(code)}`;
          break;
        case 'auto':
        default:
          endpoint = `/api/products/search/${encodeURIComponent(code)}?type=auto`;
          break;
      }

      const response = await apiService.get(endpoint);
      return response.data;
    } catch (error) {
      console.error('Erreur recherche produit:', error);
      throw error;
    }
  }

  // Obtenir les statistiques des meilleures ventes
  async getBestSellers(limit = 10) {
    try {
      const response = await apiService.get(`/api/products/stats/best-sellers?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des meilleures ventes:', error);
      throw error;
    }
  }
}

export default new SalesService();
