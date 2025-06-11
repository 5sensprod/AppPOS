// src/services/cashierSessionService.js - Version CLIENT avec notification panier
import apiService from './api';

class CashierSessionService {
  constructor() {
    this.baseEndpoint = '/api/cashier';
  }

  // Gestion de session
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
      console.error('Erreur récupération statut session:', error);
      throw error;
    }
  }

  // Gestion LCD
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
      console.error('Erreur libération contrôle LCD:', error);
      throw error;
    }
  }

  // Utilisation LCD
  async writeLCDMessage(line1, line2) {
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
      console.error('Erreur affichage welcome LCD:', error);
      throw error;
    }
  }

  async showLCDThankYou() {
    try {
      const response = await apiService.post(`${this.baseEndpoint}/lcd/thankyou`);
      return response.data;
    } catch (error) {
      console.error('Erreur affichage thank you LCD:', error);
      throw error;
    }
  }

  async clearLCDDisplay() {
    try {
      const response = await apiService.post(`${this.baseEndpoint}/lcd/clear`);
      return response.data;
    } catch (error) {
      console.error('Erreur clear LCD:', error);
      throw error;
    }
  }

  // ✅ NOUVEAU : Notifier l'API des changements de panier
  async notifyCartChange(itemCount, total) {
    try {
      const response = await apiService.post(`${this.baseEndpoint}/cart/update`, {
        item_count: itemCount,
        total: parseFloat(total),
      });
      return response.data;
    } catch (error) {
      // ✅ Erreur silencieuse pour ne pas bloquer l'interface
      console.debug('Erreur notification panier API:', error.message);
      // Ne pas throw l'erreur pour éviter de casser l'UX
    }
  }
}

// Exporter une instance unique
export default new CashierSessionService();
