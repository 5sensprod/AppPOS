//AppTools\src\components\common\EntityTable\components\BatchActions\components\ExportLabels\services\RollLabelRenderer.js
import BaseLabelRenderer from './BaseLabelRenderer.js';

/**
 * Renderer spécialisé pour les rouleaux d'étiquettes
 * Gère l'export PDF linéaire et prépare l'impression directe future
 */
class RollLabelRenderer extends BaseLabelRenderer {
  // Export des étiquettes en PDF pour rouleau
  async exportLabelsToPDF(exportConfig) {
    try {
      const { jsPDF } = await import('jspdf');
      const { labelData = [], labelLayout = {}, title = 'Etiquettes' } = exportConfig;

      if (!labelData || labelData.length === 0) {
        throw new Error("Aucune donnée d'étiquette à exporter");
      }

      const layout = labelLayout.layout || this._getDefaultRollLayout();
      const style = labelLayout.style || this._getDefaultStyle();

      // Validation que c'est bien du rouleau
      if (layout.supportType !== 'rouleau') {
        throw new Error('RollLabelRenderer ne supporte que le type "rouleau"');
      }

      const duplicateCount = style.duplicateCount || 1;
      const duplicatedLabels = this._prepareDuplicatedLabels(labelData, duplicateCount);

      const pageConfig = this._calculateRollPageLayout(layout, duplicatedLabels.length);

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [pageConfig.pageWidth, pageConfig.pageHeight],
      });

      let labelIndex = 0;

      // Rendu séquentiel des étiquettes
      while (labelIndex < duplicatedLabels.length) {
        if (labelIndex > 0) {
          doc.addPage();
        }

        const label = duplicatedLabels[labelIndex];
        await this._renderRollLabel(doc, label, layout, style, pageConfig);
        labelIndex++;
      }

      const filename = `${title}_rouleau_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename);

      return { success: true, filename };
    } catch (error) {
      console.error('Erreur export PDF rouleau:', error);
      throw error;
    }
  }

  // Rendu d'une étiquette sur rouleau
  async _renderRollLabel(doc, label, layout, style, pageConfig) {
    const imgData = await this._renderSingleLabelToCanvas(label, layout, style);

    const position = this._calculateRollLabelPosition(pageConfig, layout);

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
  }

  //Calcul de la configuration de page pour rouleau
  _calculateRollPageLayout(layout, totalLabels = 1) {
    return {
      isRollMode: true,
      pageWidth: layout.rouleau?.width || layout.width,
      pageHeight: layout.height,
      labelsPerPage: 1,
      totalLabels,
    };
  }

  //Calcul de la position d'une étiquette sur rouleau (centrée)
  _calculateRollLabelPosition(pageConfig, layout) {
    return {
      x: (pageConfig.pageWidth - layout.width) / 2,
      y: (pageConfig.pageHeight - layout.height) / 2,
    };
  }

  //Configuration par défaut pour rouleau
  _getDefaultRollLayout() {
    return {
      width: 50,
      height: 30,
      offsetTop: 5,
      offsetLeft: 5,
      spacingV: 2,
      spacingH: 0,
      supportType: 'rouleau',
      rouleau: { width: 58 },
    };
  }

  //Style par défaut
  _getDefaultStyle() {
    return {
      padding: 1,
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
  _downloadDataURL(dataURL, filename = 'etiquette.png') {
    const a = document.createElement('a');
    a.href = dataURL;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  async getAvailablePrinters() {
    try {
      const apiService = await import('../../../../../../../../services/api');
      const response = await apiService.default.get('/api/label-printing/printers');
      return response.data.printers;
    } catch (error) {
      console.error('❌ [ROLL] Erreur récupération imprimantes:', error);
      throw error;
    }
  }

  //Impression directe des étiquettes
  async printLabelsDirectly(printConfig) {
    try {
      const { labelData = [], labelLayout = {}, printerName, copies = 1 } = printConfig;

      if (!labelData || labelData.length === 0) {
        throw new Error("Aucune donnée d'étiquette à imprimer");
      }

      const layout = labelLayout.layout || this._getDefaultRollLayout();
      const style = labelLayout.style || this._getDefaultStyle();

      if (layout.supportType !== 'rouleau') {
        throw new Error("L'impression directe ne supporte que le type 'rouleau'");
      }

      const duplicateCount = style.duplicateCount || 1;
      const duplicatedLabels = this._prepareDuplicatedLabels(labelData, duplicateCount);

      console.log(
        `🖨️ [PRINT] Simulation de ${duplicatedLabels.length} étiquettes à télécharger (aucune impression)`
      );

      // === Mode test : téléchargement local ===
      for (let i = 0; i < duplicatedLabels.length; i++) {
        const label = duplicatedLabels[i];

        const imageData = await this._renderSingleLabelToCanvas(label, layout, style);
        const filename = `etiquette_${i + 1}_${label.name || 'label'}.png`;

        this._downloadDataURL(imageData, filename); // ⬅️ Téléchargement
      }

      return { success: true, message: 'Images téléchargées localement (impression désactivée)' };
    } catch (error) {
      console.error('❌ [ROLL] Erreur dans printLabelsDirectly (mode test):', error);
      throw error;
    }
  }
}

export default new RollLabelRenderer();
