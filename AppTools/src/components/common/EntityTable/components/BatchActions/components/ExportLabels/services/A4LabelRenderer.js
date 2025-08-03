//services/A4LabelRenderer.js
import BaseLabelRenderer from './BaseLabelRenderer.js';

/**
 * Renderer spécialisé pour l'export PDF sur planches A4
 * Gère la logique de grille, pagination et cellules désactivées
 */
class A4LabelRenderer extends BaseLabelRenderer {
  /**
   * Export des étiquettes en PDF sur format A4
   */
  async exportLabelsToPDF(exportConfig) {
    try {
      const { jsPDF } = await import('jspdf');
      const { labelData = [], labelLayout = {}, title = 'Etiquettes' } = exportConfig;

      if (!labelData || labelData.length === 0) {
        throw new Error("Aucune donnée d'étiquette à exporter");
      }

      const layout = labelLayout.layout || this._getDefaultA4Layout();
      const style = labelLayout.style || this._getDefaultStyle();

      // Validation que c'est bien du A4
      if (layout.supportType !== 'A4' && layout.supportType !== 'custom') {
        throw new Error('A4LabelRenderer ne supporte que les formats A4 et custom');
      }

      const duplicateCount = style.duplicateCount || 1;
      const duplicatedLabels = this._prepareDuplicatedLabels(labelData, duplicateCount);

      const pageConfig = this._calculateA4PageLayout(layout);
      const disabledCells = new Set(labelLayout.disabledCells || []);

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      let labelIndex = 0;
      let currentPage = 0;

      // Génération page par page
      while (labelIndex < duplicatedLabels.length) {
        if (currentPage > 0) {
          doc.addPage();
        }

        labelIndex = await this._renderA4Page(
          doc,
          duplicatedLabels,
          labelIndex,
          layout,
          style,
          pageConfig,
          disabledCells
        );

        currentPage++;
      }

      const filename = `${title}_A4_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename);

      return { success: true, filename };
    } catch (error) {
      console.error('Erreur export PDF A4:', error);
      throw error;
    }
  }

  /**
   * Rendu d'une page A4 complète
   */
  async _renderA4Page(doc, duplicatedLabels, startIndex, layout, style, pageConfig, disabledCells) {
    let cellIndex = 0;
    let labelIndex = startIndex;
    let labelsPlacedOnPage = 0;

    while (
      cellIndex < pageConfig.labelsPerPage &&
      labelIndex < duplicatedLabels.length &&
      labelsPlacedOnPage < pageConfig.labelsPerPage
    ) {
      // Ignorer les cellules désactivées
      if (disabledCells.has(cellIndex)) {
        cellIndex++;
        continue;
      }

      const label = duplicatedLabels[labelIndex];
      const imgData = await this._renderSingleLabelToCanvas(label, layout, style);
      const position = this._calculateA4LabelPosition(cellIndex, pageConfig, layout);

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

      labelIndex++;
      labelsPlacedOnPage++;
      cellIndex++;
    }

    return labelIndex;
  }

  /**
   * Calcul de la configuration de page A4
   */
  _calculateA4PageLayout(layout) {
    const pageWidth = 210;
    const pageHeight = 297;
    const usableWidth = pageWidth - (layout.offsetLeft || 8) * 2;
    const usableHeight = pageHeight - (layout.offsetTop || 22) * 2;

    const columns = Math.floor(usableWidth / (layout.width + (layout.spacingH || 0)));
    const rows = Math.floor(usableHeight / (layout.height + (layout.spacingV || 0)));

    return {
      isRollMode: false,
      pageWidth,
      pageHeight,
      columns,
      rows,
      labelsPerPage: columns * rows,
    };
  }

  /**
   * Calcul de la position d'une étiquette sur la page A4
   */
  _calculateA4LabelPosition(cellIndex, pageConfig, layout) {
    const col = cellIndex % pageConfig.columns;
    const row = Math.floor(cellIndex / pageConfig.columns);

    return {
      x: (layout.offsetLeft || 8) + col * (layout.width + (layout.spacingH || 0)),
      y: (layout.offsetTop || 22) + row * (layout.height + (layout.spacingV || 0)),
    };
  }

  /**
   * Configuration par défaut pour A4
   */
  _getDefaultA4Layout() {
    return {
      width: 48.5,
      height: 25,
      offsetTop: 22,
      offsetLeft: 8,
      spacingV: 0,
      spacingH: 0,
      supportType: 'A4',
    };
  }

  /**
   * Style par défaut
   */
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
}

export default new A4LabelRenderer();
