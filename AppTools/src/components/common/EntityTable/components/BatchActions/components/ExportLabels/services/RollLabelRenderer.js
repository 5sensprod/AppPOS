import BaseLabelRenderer from './BaseLabelRenderer.js';

/**
 * Renderer optimisé pour les rouleaux d'étiquettes
 */
class RollLabelRenderer extends BaseLabelRenderer {
  // 🚀 Export PDF rouleau simplifié
  async exportLabelsToPDF(exportConfig) {
    try {
      const { jsPDF } = await import('jspdf');
      const { labelData = [], labelLayout = {}, title = 'Etiquettes' } = exportConfig;

      if (!labelData.length) {
        throw new Error("Aucune donnée d'étiquette à exporter");
      }

      const layout = labelLayout.layout || this._getDefaultLayout();
      const style = labelLayout.style || this._getDefaultStyle();

      // Validation du type de support
      if (layout.supportType !== 'rouleau') {
        throw new Error('RollLabelRenderer ne supporte que le type "rouleau"');
      }

      // Préparation des données
      const duplicatedLabels = this._prepareDuplicatedLabels(labelData, style.duplicateCount || 1);
      const pageConfig = this._calculatePageLayout(layout);

      // 🎯 Initialisation PDF avec dimensions dynamiques
      const doc = new jsPDF('p', 'mm', 'a4');
      this._setCustomPageSize(doc, pageConfig);

      // 🎯 Génération étiquette par étiquette (mode rouleau)
      for (let i = 0; i < duplicatedLabels.length; i++) {
        if (i > 0) {
          doc.addPage();
          this._setCustomPageSize(doc, pageConfig);
        }

        await this._renderLabel(doc, duplicatedLabels[i], layout, style, pageConfig);
      }

      // Sauvegarde
      const filename = `${title}_rouleau_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename);

      return { success: true, filename, labels: duplicatedLabels.length };
    } catch (error) {
      console.error('❌ Erreur export PDF rouleau:', error);
      throw error;
    }
  }

  // 🎯 Rendu d'une étiquette rouleau
  async _renderLabel(doc, label, layout, style, pageConfig) {
    try {
      const imgData = await this._renderSingleLabelToCanvas(label, layout, style, 'export');
      const position = this._calculateLabelPosition(pageConfig, layout);

      doc.addImage(
        imgData,
        'PNG',
        position.x,
        position.y,
        layout.width,
        layout.height,
        undefined,
        'FAST'
      );
    } catch (error) {
      console.warn(`⚠️ Erreur rendu étiquette ${label.name}:`, error);
      // Continue avec les autres étiquettes
    }
  }

  // 🎯 Configuration page rouleau
  _calculatePageLayout(layout) {
    return {
      pageWidth: layout.rouleau?.width || layout.width,
      pageHeight: layout.height,
      labelsPerPage: 1,
    };
  }

  // 🎯 Position étiquette centrée
  _calculateLabelPosition(pageConfig, layout) {
    return {
      x: (pageConfig.pageWidth - layout.width) / 2,
      y: (pageConfig.pageHeight - layout.height) / 2,
    };
  }

  // 🎯 Configuration des dimensions PDF
  _setCustomPageSize(doc, pageConfig) {
    doc.internal.pageSize.width = pageConfig.pageWidth;
    doc.internal.pageSize.height = pageConfig.pageHeight;
    doc.internal.pageSize.getWidth = () => pageConfig.pageWidth;
    doc.internal.pageSize.getHeight = () => pageConfig.pageHeight;
  }

  // 🎯 Configuration par défaut
  _getDefaultLayout() {
    return {
      width: 50,
      height: 30,
      spacingV: 2,
      spacingH: 0,
      supportType: 'rouleau',
      rouleau: { width: 58 },
    };
  }

  _getDefaultStyle() {
    return {
      showBorder: false,
      showName: false,
      showPrice: true,
      showBarcode: true,
      nameSize: 10,
      priceSize: 14,
      barcodeHeight: 15,
      duplicateCount: 1,
    };
  }

  // 🆕 MÉTHODES D'IMPRESSION DIRECTE

  // 🖨️ Obtenir les imprimantes disponibles
  async getAvailablePrinters() {
    try {
      const apiService = await import('../../../../../../../../services/api');
      const response = await apiService.default.get('/api/label-printing/printers');
      return response.data.printers || [];
    } catch (error) {
      console.error('❌ Erreur récupération imprimantes:', error);
      throw new Error('Impossible de récupérer les imprimantes disponibles');
    }
  }

  async printLabelsDirectly(printConfig) {
    try {
      const { labelData = [], labelLayout = {}, printerName, copies = 1 } = printConfig;
      if (!labelData.length) {
        throw new Error("Aucune donnée d'étiquette à imprimer");
      }
      const layout = labelLayout.layout || this._getDefaultLayout();
      const style = labelLayout.style || this._getDefaultStyle();
      // Validation mode rouleau
      if (layout.supportType !== 'rouleau') {
        throw new Error('L\'impression directe ne supporte que le type "rouleau"');
      }
      // Préparation des données
      const duplicatedLabels = this._prepareDuplicatedLabels(labelData, style.duplicateCount || 1);
      console.log(`🖨️ Génération ${duplicatedLabels.length} étiquettes pour impression directe`);
      // 🎯 Génération des images en parallèle (plus rapide)
      const images = await Promise.all(
        duplicatedLabels.map(async (label, index) => {
          try {
            return await this._renderSingleLabelToCanvas(label, layout, style, 'print');
          } catch (error) {
            console.warn(`⚠️ Erreur génération étiquette ${index}:`, error);
            return null; // Skip cette étiquette
          }
        })
      );
      // Filtrer les images valides
      const validImages = images.filter(Boolean);
      if (!validImages.length) {
        throw new Error('Aucune étiquette valide générée');
      }

      // 🖨️ Envoi vers l'imprimante SANS MODIFICATION
      const apiService = await import('../../../../../../../../services/api');
      const response = await apiService.default.post('/api/label-printing/print-labels', {
        images: validImages,
        printerName,
        layout,
        copies,
        preserveOriginalSize: true, // 🎯 NOUVEAU PARAMÈTRE pour conserver la taille originale
      });
      return {
        ...response.data,
        generated: duplicatedLabels.length,
        sent: validImages.length,
      };
    } catch (error) {
      console.error('❌ Erreur impression directe:', error);
      throw error;
    }
  }

  // 🆕 Test rapide d'imprimante
  async testPrinter(printerName) {
    try {
      const apiService = await import('../../../../../../../../services/api');
      const response = await apiService.default.post('/api/label-printing/test-printer', {
        printerName,
      });
      return response.data;
    } catch (error) {
      console.error('❌ Erreur test imprimante:', error);
      throw error;
    }
  }
}

export default new RollLabelRenderer();
