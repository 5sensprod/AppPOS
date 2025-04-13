// src/services/exportService.js - Version optimisée avec envoi d'IDs uniquement
import apiService from './api';

/**
 * Service pour gérer les exports de données
 */
class ExportService {
  /**
   * Exporte les produits selon la configuration fournie
   *
   * @param {Object} exportConfig - Configuration de l'export
   * @returns {Promise} - Promise qui résout à un Blob du fichier exporté
   */
  async exportProducts(exportConfig) {
    try {
      const { format = 'pdf' } = exportConfig;

      if (format === 'pdf') {
        return this.exportProductsToPDF(exportConfig);
      } else if (format === 'csv') {
        return this.exportProductsToCSV(exportConfig);
      } else {
        throw new Error(`Format d'export non supporté: ${format}`);
      }
    } catch (error) {
      console.error(`Erreur lors de l'export:`, error);
      throw error;
    }
  }

  /**
   * Exporte les produits au format PDF
   *
   * @param {Object} exportConfig - Configuration de l'export
   * @param {Array} exportConfig.selectedItems - IDs des éléments sélectionnés
   * @param {Array} exportConfig.selectedColumns - Clés des colonnes à exporter
   * @param {String} exportConfig.orientation - 'portrait' ou 'landscape'
   * @param {String} exportConfig.title - Titre du document
   * @param {Object} exportConfig.customColumn - Configuration de la colonne personnalisée
   * @returns {Promise} - Promise qui résout à un Blob PDF
   */
  async exportProductsToPDF(exportConfig) {
    try {
      // Créer une nouvelle configuration qui n'inclut pas les données complètes des produits
      // pour éviter les problèmes de taille de requête
      const streamlinedConfig = {
        selectedItems: exportConfig.selectedItems,
        selectedColumns: exportConfig.selectedColumns,
        orientation: exportConfig.orientation,
        title: exportConfig.title,
        customColumn: exportConfig.customColumn,
        // Ne pas inclure le tableau 'products' complet
      };

      console.log("Demande d'export PDF avec configuration optimisée:", streamlinedConfig);

      // Appel API pour générer le PDF
      const response = await apiService.post('/api/products/export/pdf', streamlinedConfig, {
        responseType: 'blob', // Important pour recevoir des données binaires
      });

      // Créer un nom de fichier
      const filename = `${exportConfig.title || 'Export Produits'}_${new Date().toISOString().split('T')[0]}.pdf`;

      // Télécharger le fichier
      this.downloadBlob(response.data, filename, 'application/pdf');

      return response.data;
    } catch (error) {
      console.error("Erreur lors de l'export PDF:", error);
      throw error;
    }
  }

  /**
   * Exporte des produits au format CSV
   *
   * @param {Object} exportConfig - Configuration de l'export
   * @returns {Promise} - Promise qui résout à un Blob CSV
   */
  async exportProductsToCSV(exportConfig) {
    try {
      // Créer une nouvelle configuration qui n'inclut pas les données complètes des produits
      const streamlinedConfig = {
        selectedItems: exportConfig.selectedItems,
        selectedColumns: exportConfig.selectedColumns,
        title: exportConfig.title,
        customColumn: exportConfig.customColumn,
        // Ne pas inclure le tableau 'products' complet
      };

      console.log("Demande d'export CSV avec configuration optimisée:", streamlinedConfig);

      const response = await apiService.post('/api/products/export/csv', streamlinedConfig, {
        responseType: 'blob',
      });

      const filename = `${exportConfig.title || 'Export Produits'}_${new Date().toISOString().split('T')[0]}.csv`;

      this.downloadBlob(response.data, filename, 'text/csv');

      return response.data;
    } catch (error) {
      console.error("Erreur lors de l'export CSV:", error);
      throw error;
    }
  }

  /**
   * Télécharge un blob comme fichier
   *
   * @param {Blob} blob - Les données binaires
   * @param {String} filename - Nom du fichier
   * @param {String} mimeType - Type MIME
   */
  downloadBlob(blob, filename, mimeType) {
    // Créer une URL pour le blob
    const url = window.URL.createObjectURL(new Blob([blob], { type: mimeType }));

    // Créer un élément a temporaire
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);

    // Ajouter l'élément au DOM
    document.body.appendChild(link);

    // Déclencher le téléchargement
    link.click();

    // Nettoyer
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    }, 100);
  }
}

export default new ExportService();
