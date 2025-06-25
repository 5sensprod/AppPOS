// AppServe/templates/pdf/helpers/templateHelpers.js

const PDFStyles = require('../pdfStyles');

class TemplateHelpers {
  /**
   * Formate un montant en euros
   */
  formatCurrency(amount) {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount || 0);
  }

  /**
   * Formate un nombre avec les séparateurs français
   */
  formatNumber(num) {
    return new Intl.NumberFormat('fr-FR').format(num || 0);
  }

  /**
   * Formate un pourcentage
   */
  formatPercentage(num) {
    return new Intl.NumberFormat('fr-FR', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format((num || 0) / 100);
  }

  /**
   * Formate une date en français
   */
  formatDate(date = new Date()) {
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  /**
   * Formate une heure
   */
  formatTime(date = new Date()) {
    return date.toLocaleTimeString('fr-FR');
  }

  /**
   * Formate une date courte
   */
  formatShortDate(date = new Date()) {
    return date.toLocaleDateString('fr-FR');
  }

  /**
   * Obtient le libellé d'un taux de TVA
   */
  getTaxRateLabel(rate) {
    const labels = {
      0: 'Exonéré (0%)',
      2.1: 'Taux super réduit (2,1%)',
      5.5: 'Taux réduit (5,5%)',
      10: 'Taux intermédiaire (10%)',
      20: 'Taux normal (20%)',
    };
    return labels[rate] || `Taux spécial (${rate}%)`;
  }

  /**
   * Génère un ID unique pour les éléments HTML
   */
  generateId() {
    return `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Échappe les caractères HTML
   */
  escapeHtml(text) {
    if (!text) return '';
    return text
      .toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Arrondit un nombre à 2 décimales
   */
  roundTo2Decimals(num) {
    return Math.round((num || 0) * 100) / 100;
  }

  /**
   * Vérifie si une valeur est vide ou nulle
   */
  isEmpty(value) {
    return value === null || value === undefined || value === '';
  }

  /**
   * Obtient une valeur par défaut si la valeur est vide
   */
  getDefault(value, defaultValue = '-') {
    return this.isEmpty(value) ? defaultValue : value;
  }

  /**
   * Obtient les styles CSS pour un type de rapport donné
   * @param {string} reportType - Type de rapport ('summary', 'detailed', 'grouped')
   * @param {Object} options - Options de style
   * @returns {string} - CSS complet
   */
  getStylesFor(reportType, options = {}) {
    return PDFStyles.getStylesFor(reportType, options);
  }

  /**
   * Méthodes de compatibilité (à supprimer progressivement)
   * @deprecated Utiliser getStylesFor() à la place
   */
  getAllStyles() {
    return this.getStylesFor('summary');
  }

  getBasePDFStyles() {
    return PDFStyles.getBase();
  }

  getHeaderStyles() {
    return PDFStyles.getHeader();
  }

  getTableStyles() {
    return PDFStyles.getTables();
  }

  getMetricsStyles() {
    return PDFStyles.getMetrics();
  }
}

module.exports = TemplateHelpers;
