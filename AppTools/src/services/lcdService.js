// src/services/lcdService.js
import apiService from './api';

class LCDService {
  constructor() {
    this.baseEndpoint = '/api/lcd';
  }

  // Gestion des ports
  async listPorts() {
    try {
      const response = await apiService.get(`${this.baseEndpoint}/ports`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des ports:', error);
      throw error;
    }
  }

  // Gestion de la connexion
  async connect(portPath, config = {}) {
    try {
      const response = await apiService.post(`${this.baseEndpoint}/connect`, {
        port_path: portPath,
        config,
      });
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la connexion:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      const response = await apiService.post(`${this.baseEndpoint}/disconnect`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      throw error;
    }
  }

  async getStatus() {
    try {
      const response = await apiService.get(`${this.baseEndpoint}/status`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération du statut:', error);
      throw error;
    }
  }

  // Messages génériques
  async writeMessage(line1 = '', line2 = '') {
    try {
      const response = await apiService.post(`${this.baseEndpoint}/write`, {
        line1,
        line2,
      });
      return response.data;
    } catch (error) {
      console.error("Erreur lors de l'écriture du message:", error);
      throw error;
    }
  }

  async clearDisplay() {
    try {
      const response = await apiService.post(`${this.baseEndpoint}/clear`);
      return response.data;
    } catch (error) {
      console.error("Erreur lors de l'effacement:", error);
      throw error;
    }
  }

  // Messages POS prédéfinis
  async showPrice(itemName, price) {
    try {
      const response = await apiService.post(`${this.baseEndpoint}/show/price`, {
        item_name: itemName,
        price: parseFloat(price),
      });
      return response.data;
    } catch (error) {
      console.error("Erreur lors de l'affichage du prix:", error);
      throw error;
    }
  }

  async showTotal(total) {
    try {
      const response = await apiService.post(`${this.baseEndpoint}/show/total`, {
        total: parseFloat(total),
      });
      return response.data;
    } catch (error) {
      console.error("Erreur lors de l'affichage du total:", error);
      throw error;
    }
  }

  async showWelcome() {
    try {
      const response = await apiService.post(`${this.baseEndpoint}/show/welcome`);
      return response.data;
    } catch (error) {
      console.error("Erreur lors de l'affichage du message de bienvenue:", error);
      throw error;
    }
  }

  async showThankYou() {
    try {
      const response = await apiService.post(`${this.baseEndpoint}/show/thankyou`);
      return response.data;
    } catch (error) {
      console.error("Erreur lors de l'affichage du message de remerciement:", error);
      throw error;
    }
  }

  async showError(errorMessage) {
    try {
      const response = await apiService.post(`${this.baseEndpoint}/show/error`, {
        error_message: errorMessage,
      });
      return response.data;
    } catch (error) {
      console.error("Erreur lors de l'affichage du message d'erreur:", error);
      throw error;
    }
  }

  // Test complet
  async runTest() {
    try {
      const response = await apiService.post(`${this.baseEndpoint}/test`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors du test:', error);
      throw error;
    }
  }

  // Méthodes utilitaires
  formatText(text) {
    if (!text) return '';

    return String(text)
      .replace(/[àáâãäå]/g, 'a')
      .replace(/[èéêë]/g, 'e')
      .replace(/[ìíîï]/g, 'i')
      .replace(/[òóôõö]/g, 'o')
      .replace(/[ùúûü]/g, 'u')
      .replace(/[ç]/g, 'c')
      .replace(/[€]/g, 'EUR')
      .replace(/[^\x20-\x7E]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 20);
  }

  validateMessage(line1, line2) {
    const errors = [];

    if (line1 && line1.length > 20) {
      errors.push('La ligne 1 ne peut pas dépasser 20 caractères');
    }

    if (line2 && line2.length > 20) {
      errors.push('La ligne 2 ne peut pas dépasser 20 caractères');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Méthodes pour la gestion d'état local
  createConnectionState() {
    return {
      connected: false,
      loading: false,
      error: null,
      port: null,
      config: null,
      lastUpdate: null,
      connectionTime: null,
      messagesCount: 0,
    };
  }

  // Configuration par défaut
  getDefaultConfig() {
    return {
      baudRate: 9600,
      dataBits: 8,
      parity: 'none',
      stopBits: 1,
      lines: 2,
      charactersPerLine: 20,
    };
  }

  // Validation de la configuration
  validateConfig(config) {
    const validBaudRates = [9600, 19200, 38400, 57600, 115200];
    const validParities = ['none', 'even', 'odd'];
    const validDataBits = [7, 8];
    const validStopBits = [1, 2];

    const errors = [];

    if (config.baudRate && !validBaudRates.includes(config.baudRate)) {
      errors.push('Baud rate invalide');
    }

    if (config.parity && !validParities.includes(config.parity)) {
      errors.push('Parité invalide');
    }

    if (config.dataBits && !validDataBits.includes(config.dataBits)) {
      errors.push('Nombre de bits de données invalide');
    }

    if (config.stopBits && !validStopBits.includes(config.stopBits)) {
      errors.push("Nombre de bits d'arrêt invalide");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

// Exporter une instance unique
export default new LCDService();
