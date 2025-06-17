// src/services/reportsService.js
import apiService from './api';

class ReportsService {
  constructor() {
    this.baseEndpoint = '/api/reports';
  }

  // Récupérer l'historique des rapports
  async getHistoricalReports(params = {}) {
    try {
      const response = await apiService.get(`${this.baseEndpoint}/history`, { params });
      return response.data;
    } catch (error) {
      console.error('Erreur récupération historique rapports:', error);
      throw error;
    }
  }

  // Récupérer un rapport spécifique par ID
  async getReportById(reportId) {
    try {
      const response = await apiService.get(`${this.baseEndpoint}/${reportId}`);
      return response.data;
    } catch (error) {
      console.error('Erreur récupération rapport:', error);
      throw error;
    }
  }

  // Récupérer un rapport par session ID
  async getReportBySessionId(sessionId) {
    try {
      const response = await apiService.get(`${this.baseEndpoint}/session/${sessionId}`);
      return response.data;
    } catch (error) {
      console.error('Erreur récupération rapport par session:', error);
      throw error;
    }
  }

  // Statistiques des rapports
  async getReportsStats(params = {}) {
    try {
      const response = await apiService.get(`${this.baseEndpoint}/stats`, { params });
      return response.data;
    } catch (error) {
      console.error('Erreur récupération stats rapports:', error);
      throw error;
    }
  }

  // Export d'un rapport
  async exportReport(reportId, format = 'pdf') {
    try {
      const response = await apiService.get(`${this.baseEndpoint}/${reportId}/export`, {
        params: { format },
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      console.error('Erreur export rapport:', error);
      throw error;
    }
  }
}

export default new ReportsService();
