// AppServe/templates/pdf/helpers/templateHelpers.js

class TemplateHelpers {
  /**
   * Formate un montant en euros
   * @param {number} amount - Montant à formater
   * @returns {string} - Montant formaté
   */
  formatCurrency(amount) {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount || 0);
  }

  /**
   * Formate un nombre avec les séparateurs français
   * @param {number} num - Nombre à formater
   * @returns {string} - Nombre formaté
   */
  formatNumber(num) {
    return new Intl.NumberFormat('fr-FR').format(num || 0);
  }

  /**
   * Formate un pourcentage
   * @param {number} num - Nombre à formater en pourcentage
   * @returns {string} - Pourcentage formaté
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
   * @param {Date} date - Date à formater
   * @returns {string} - Date formatée
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
   * @param {Date} date - Date à formater
   * @returns {string} - Heure formatée
   */
  formatTime(date = new Date()) {
    return date.toLocaleTimeString('fr-FR');
  }

  /**
   * Formate une date courte
   * @param {Date} date - Date à formater
   * @returns {string} - Date courte formatée
   */
  formatShortDate(date = new Date()) {
    return date.toLocaleDateString('fr-FR');
  }

  /**
   * Obtient le libellé d'un taux de TVA
   * @param {number} rate - Taux de TVA
   * @returns {string} - Libellé du taux
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
   * @returns {string} - ID unique
   */
  generateId() {
    return `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Échappe les caractères HTML
   * @param {string} text - Texte à échapper
   * @returns {string} - Texte échappé
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
   * @param {number} num - Nombre à arrondir
   * @returns {number} - Nombre arrondi
   */
  roundTo2Decimals(num) {
    return Math.round((num || 0) * 100) / 100;
  }

  /**
   * Vérifie si une valeur est vide ou nulle
   * @param {*} value - Valeur à vérifier
   * @returns {boolean} - True si vide
   */
  isEmpty(value) {
    return value === null || value === undefined || value === '';
  }

  /**
   * Obtient une valeur par défaut si la valeur est vide
   * @param {*} value - Valeur à vérifier
   * @param {*} defaultValue - Valeur par défaut
   * @returns {*} - Valeur ou valeur par défaut
   */
  getDefault(value, defaultValue = '-') {
    return this.isEmpty(value) ? defaultValue : value;
  }

  /**
   * Génère les styles CSS de base pour les PDFs
   * @returns {string} - CSS de base
   */
  getBasePDFStyles() {
    return `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: 'Segoe UI', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        font-size: 11pt;
        line-height: 1.5;
        color: #1f2937;
        background: white;
        margin: 0;
        padding: 20mm;
      }

      .page {
        width: 100%;
        max-width: 210mm;
        margin: 0 auto;
      }

      /* Styles d'impression optimisés */
      @media print {
        body {
          margin: 0;
          padding: 15mm;
          font-size: 10pt;
        }

        .page {
          width: 100%;
          max-width: none;
        }

        * {
          -webkit-print-color-adjust: exact !important;
          color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      }

      @page {
        size: A4;
        margin: 15mm;
        orphans: 3;
        widows: 3;
      }
    `;
  }

  /**
   * Génère les styles pour les en-têtes
   * @returns {string} - CSS pour les en-têtes
   */
  getHeaderStyles() {
    return `
      .header {
        border-bottom: 3px solid #3b82f6;
        padding-bottom: 15mm;
        margin-bottom: 15mm;
      }

      .header h1 {
        font-size: 28pt;
        font-weight: 700;
        color: #1f2937;
        margin-bottom: 5mm;
        letter-spacing: -0.5px;
      }

      .header .subtitle {
        font-size: 12pt;
        color: #6b7280;
        font-weight: 400;
      }
    `;
  }

  /**
   * Génère les styles pour les tableaux
   * @returns {string} - CSS pour les tableaux
   */
  getTableStyles() {
    return `
      .data-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 6mm;
        font-size: 9pt;
      }

      .data-table th {
        background: #e8e8e8;
        border: 1px solid #999;
        padding: 3mm 2mm;
        text-align: center;
        font-weight: bold;
        font-size: 8pt;
        text-transform: uppercase;
        letter-spacing: 0.3pt;
      }

      .data-table td {
        border: 1px solid #ccc;
        padding: 2mm;
        text-align: right;
        vertical-align: middle;
      }

      .data-table td:first-child {
        text-align: left;
        font-weight: bold;
      }

      .data-table tbody tr:nth-child(even) {
        background: #f9f9f9;
      }

      .data-table tbody tr:hover {
        background: #f0f0f0;
      }

      .totals-row {
        background: #e0e0e0 !important;
        font-weight: bold;
        border-top: 2px solid #333 !important;
      }
    `;
  }

  /**
   * Génère les styles pour les métriques
   * @returns {string} - CSS pour les métriques
   */
  getMetricsStyles() {
    return `
      .metrics-section {
        margin-bottom: 8mm;
        page-break-inside: avoid;
      }

      .metrics-title {
        font-size: 14pt;
        font-weight: 600;
        margin-bottom: 6mm;
        color: #1f2937;
        border-bottom: 2px solid #e5e7eb;
        padding-bottom: 2mm;
      }

      .metrics-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 6mm;
        margin-bottom: 6mm;
      }

      .metric-box {
        border: 1px solid #d1d5db;
        padding: 6mm;
        background: #ffffff;
        border-radius: 2mm;
      }

      .metric-label {
        font-size: 9pt;
        color: #6b7280;
        margin-bottom: 2mm;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.3pt;
      }

      .metric-value {
        font-size: 16pt;
        font-weight: 700;
        color: #1f2937;
        margin-bottom: 1mm;
      }

      .metric-subtitle {
        font-size: 8pt;
        color: #9ca3af;
      }
    `;
  }

  /**
   * Combine tous les styles CSS
   * @returns {string} - CSS complet
   */
  getAllStyles() {
    return [
      this.getBasePDFStyles(),
      this.getHeaderStyles(),
      this.getTableStyles(),
      this.getMetricsStyles(),
    ].join('\n');
  }
}

module.exports = TemplateHelpers;
