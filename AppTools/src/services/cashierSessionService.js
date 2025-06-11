// src/services/cashierSessionService.js - Service frontend
import apiService from './api';

class CashierSessionService {
  constructor() {
    this.baseEndpoint = '/api/cashier';
  }

  // ✅ GESTION DE SESSION
  async openSession(lcdPort = null, lcdConfig = {}) {
    try {
      const response = await apiService.post(`${this.baseEndpoint}/session/open`, {
        lcd_port: lcdPort,
        lcd_config: lcdConfig,
      });
      return response.data;
    } catch (error) {
      console.error('Erreur ouverture session:', error);
      throw error;
    }
  }

  async closeSession() {
    try {
      const response = await apiService.post(`${this.baseEndpoint}/session/close`);
      return response.data;
    } catch (error) {
      console.error('Erreur fermeture session:', error);
      throw error;
    }
  }

  async getSessionStatus() {
    try {
      const response = await apiService.get(`${this.baseEndpoint}/session/status`);
      return response.data;
    } catch (error) {
      console.error('Erreur statut session:', error);
      throw error;
    }
  }

  // ✅ GESTION LCD
  async listLCDPorts() {
    try {
      const response = await apiService.get(`${this.baseEndpoint}/lcd/ports`);
      return response.data;
    } catch (error) {
      console.error('Erreur liste ports LCD:', error);
      throw error;
    }
  }

  async requestLCDControl(port, config = {}) {
    try {
      const response = await apiService.post(`${this.baseEndpoint}/lcd/request`, {
        port,
        config,
      });
      return response.data;
    } catch (error) {
      console.error('Erreur demande contrôle LCD:', error);
      throw error;
    }
  }

  async releaseLCDControl() {
    try {
      const response = await apiService.post(`${this.baseEndpoint}/lcd/release`);
      return response.data;
    } catch (error) {
      console.error('Erreur libération LCD:', error);
      throw error;
    }
  }

  // ✅ UTILISATION LCD
  async writeLCDMessage(line1 = '', line2 = '') {
    try {
      const response = await apiService.post(`${this.baseEndpoint}/lcd/write`, {
        line1,
        line2,
      });
      return response.data;
    } catch (error) {
      console.error('Erreur écriture LCD:', error);
      throw error;
    }
  }

  async showLCDPrice(itemName, price) {
    try {
      const response = await apiService.post(`${this.baseEndpoint}/lcd/price`, {
        item_name: itemName,
        price: parseFloat(price),
      });
      return response.data;
    } catch (error) {
      console.error('Erreur affichage prix LCD:', error);
      throw error;
    }
  }

  async showLCDTotal(total) {
    try {
      const response = await apiService.post(`${this.baseEndpoint}/lcd/total`, {
        total: parseFloat(total),
      });
      return response.data;
    } catch (error) {
      console.error('Erreur affichage total LCD:', error);
      throw error;
    }
  }

  async showLCDWelcome() {
    try {
      const response = await apiService.post(`${this.baseEndpoint}/lcd/welcome`);
      return response.data;
    } catch (error) {
      console.error('Erreur affichage bienvenue LCD:', error);
      throw error;
    }
  }

  async showLCDThankYou() {
    try {
      const response = await apiService.post(`${this.baseEndpoint}/lcd/thankyou`);
      return response.data;
    } catch (error) {
      console.error('Erreur affichage remerciement LCD:', error);
      throw error;
    }
  }

  async clearLCDDisplay() {
    try {
      const response = await apiService.post(`${this.baseEndpoint}/lcd/clear`);
      return response.data;
    } catch (error) {
      console.error('Erreur effacement LCD:', error);
      throw error;
    }
  }

  // ✅ ADMINISTRATION
  async getActiveSessions() {
    try {
      const response = await apiService.get(`${this.baseEndpoint}/sessions/active`);
      return response.data;
    } catch (error) {
      console.error('Erreur récupération sessions actives:', error);
      throw error;
    }
  }
}

export default new CashierSessionService();
