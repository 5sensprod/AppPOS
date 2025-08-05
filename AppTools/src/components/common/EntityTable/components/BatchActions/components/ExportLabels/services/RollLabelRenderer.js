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

      // SOLUTION 1: Méthode directe - forcer les dimensions sans auto-détection
      const doc = new jsPDF('p', 'mm', 'a4'); // Créer avec un format standard d'abord

      // Redéfinir manuellement les dimensions de page pour contourner l'auto-détection
      doc.internal.pageSize.width = pageConfig.pageWidth;
      doc.internal.pageSize.height = pageConfig.pageHeight;
      doc.internal.pageSize.getWidth = () => pageConfig.pageWidth;
      doc.internal.pageSize.getHeight = () => pageConfig.pageHeight;

      let labelIndex = 0;
      // Rendu séquentiel des étiquettes
      while (labelIndex < duplicatedLabels.length) {
        if (labelIndex > 0) {
          doc.addPage();
          // Redéfinir les dimensions pour chaque nouvelle page aussi
          doc.internal.pageSize.width = pageConfig.pageWidth;
          doc.internal.pageSize.height = pageConfig.pageHeight;
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
    console.log('🔍 AVANT renderSingleLabel:', {
      'label.name': label.name,
      'layout.width': layout.width,
      'layout.height': layout.height,
      'layout.padding': layout.padding,
    });

    const imgData = await this._renderSingleLabelToCanvas(label, layout, style);

    console.log('🔍 APRÈS renderSingleLabel:', {
      'imgData length': imgData.length,
      'imgData type': typeof imgData,
    });

    // 🔍 Vérifier la taille réelle de l'image générée
    const img = new Image();
    await new Promise((resolve) => {
      img.onload = function () {
        console.log('🔍 Image réelle générée:', {
          'img.width (px)': img.width,
          'img.height (px)': img.height,
          ratio: (img.width / img.height).toFixed(2),
          'width en mm': (img.width / 3.779527559).toFixed(1),
          'height en mm': (img.height / 3.779527559).toFixed(1),
        });
        resolve();
      };
      img.src = imgData;
    });

    const position = this._calculateRollLabelPosition(pageConfig, layout);
    const realWidthMm = img.width / 3.779527559;
    const realHeightMm = img.height / 3.779527559;
    console.log('🔍 AVANT addImage:', {
      'position.x': position.x,
      'position.y': position.y,
      'layout.width': layout.width,
      'layout.height': layout.height,
      pageConfig: pageConfig,
    });

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

      spacingV: 2,
      spacingH: 0,
      supportType: 'rouleau',
      rouleau: { width: 29 },
    };
  }

  //Style par défaut
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

      // Validation que c'est bien du rouleau
      if (layout.supportType !== 'rouleau') {
        throw new Error('L\'impression directe ne supporte que le type "rouleau"');
      }

      const duplicateCount = style.duplicateCount || 1;
      const duplicatedLabels = this._prepareDuplicatedLabels(labelData, duplicateCount);

      console.log(
        `🖨️ [ROLL] Génération ${duplicatedLabels.length} étiquettes pour impression directe`
      );

      // Générer les images depuis Fabric.js (même qualité que preview)
      const images = [];
      for (const label of duplicatedLabels) {
        const imageData = await this._renderSingleLabelToCanvas(label, layout, style);
        images.push(imageData);
      }

      // ✅ CORRECTION: Import dynamique au lieu de require
      const apiService = await import('../../../../../../../../services/api');
      const response = await apiService.default.post('/api/label-printing/print-labels', {
        images,
        printerName,
        layout,
        copies,
      });

      return response.data;
    } catch (error) {
      console.error('❌ [ROLL] Erreur impression directe:', error);
      throw error;
    }
  }
}

export default new RollLabelRenderer();
