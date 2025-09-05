// AppServe/services/PDFKitService.js

const PDFDocument = require('pdfkit');
const PDFStylesConfig = require('../utils/pdf/PDFStylesConfig');
const PDFLayoutHelper = require('../utils/pdf/PDFLayoutHelper');
const PDFContentRenderer = require('../utils/pdf/PDFContentRenderer');

/**
 * Service principal pour la génération de PDF avec PDFKit
 * Remplace l'ancienne logique basée sur html-pdf/Puppeteer
 */
class PDFKitService {
  constructor() {
    this.stylesConfig = new PDFStylesConfig();
    this.layoutHelper = new PDFLayoutHelper();
    this.contentRenderer = new PDFContentRenderer();
  }

  /**
   * 🎯 MÉTHODE PRINCIPALE : Génération du rapport de stock
   */
  async generateStockReport(stockStats, options = {}) {
    try {
      const {
        reportType = 'summary',
        companyInfo = {},
        includeCompanyInfo = true,
        includeCharts = false,
        orientation = 'portrait',
      } = options;

      // Configuration du document PDF
      const docOptions = this.getDocumentOptions(orientation);
      const doc = new PDFDocument(docOptions);

      // Buffer pour récupérer le PDF généré
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));

      // Configuration des styles selon le type de rapport
      const styles = this.stylesConfig.getStylesForReport(reportType, options);

      // Génération du contenu selon le type
      switch (reportType) {
        case 'summary':
          await this.generateSummaryReport(doc, stockStats, styles, options);
          break;
        case 'detailed':
          await this.generateDetailedReport(doc, stockStats, styles, options);
          break;
        default:
          throw new Error(`Type de rapport non supporté: ${reportType}`);
      }

      // Finalisation du document
      doc.end();

      // Retour du buffer final
      return new Promise((resolve, reject) => {
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve(pdfBuffer);
        });
        doc.on('error', reject);
      });
    } catch (error) {
      throw new Error(`Erreur lors de la génération PDF: ${error.message}`);
    }
  }

  /**
   * 📋 Génération du rapport de synthèse
   */
  async generateSummaryReport(doc, stockStats, styles, options) {
    const { companyInfo, includeCompanyInfo } = options;

    // En-tête principal
    this.contentRenderer.renderHeader(doc, styles, {
      title: 'Rapport de Stock',
      subtitle: `Généré le ${this.layoutHelper.formatDate()} à ${this.layoutHelper.formatTime()}`,
    });

    // Informations entreprise (optionnel)
    if (includeCompanyInfo && companyInfo?.name) {
      this.contentRenderer.renderCompanyInfo(doc, styles, companyInfo);
    }

    // Section métriques principales
    this.contentRenderer.renderMetrics(doc, styles, stockStats);

    // Section répartition TVA
    this.contentRenderer.renderTaxBreakdown(doc, styles, stockStats);

    // Résumé exécutif
    this.contentRenderer.renderExecutiveSummary(doc, styles, stockStats);
  }

  /**
   * 📊 Génération du rapport détaillé
   */
  async generateDetailedReport(doc, stockStats, styles, options) {
    // À implémenter dans une future itération
    throw new Error('Rapport détaillé non encore implémenté avec PDFKit');
  }

  /**
   * ⚙️ Configuration du document PDF
   */
  getDocumentOptions(orientation = 'portrait') {
    const isLandscape = orientation === 'landscape';

    return {
      size: 'A4',
      layout: orientation,
      margins: {
        top: isLandscape ? 30 : 40,
        bottom: isLandscape ? 30 : 40,
        left: isLandscape ? 25 : 35,
        right: isLandscape ? 25 : 35,
      },
      info: {
        Title: 'Rapport de Stock',
        Author: 'APPPOS',
        Subject: 'Statistiques de stock',
        Creator: 'PDFKit Service',
        Producer: 'APPPOS PDFKit Service',
      },
    };
  }

  /**
   * 🔧 Méthodes utilitaires
   */
  static getFilename(reportType, options = {}) {
    let filename = `rapport_stock_${reportType}`;

    if (options.isSimplified) filename += '_simplifie';
    if (options.groupByCategory) filename += '_categories';

    const date = new Date().toISOString().split('T')[0];
    filename += `_${date}.pdf`;

    return filename;
  }

  /**
   * 📤 Envoi de la réponse HTTP avec le PDF
   */
  static sendPDFResponse(res, pdfBuffer, reportType, options = {}) {
    const filename = this.getFilename(reportType, options);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  }
}

module.exports = PDFKitService;
