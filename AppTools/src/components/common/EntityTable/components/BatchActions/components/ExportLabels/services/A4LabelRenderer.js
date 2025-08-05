import BaseLabelRenderer from './BaseLabelRenderer.js';

/**
 * Renderer optimisé pour l'export PDF sur planches A4
 */
class A4LabelRenderer extends BaseLabelRenderer {
  // 🚀 Export PDF A4 simplifié
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
      if (!['A4', 'custom'].includes(layout.supportType)) {
        throw new Error('A4LabelRenderer ne supporte que les formats A4 et custom');
      }

      // Préparation des données
      const duplicatedLabels = this._prepareDuplicatedLabels(labelData, style.duplicateCount || 1);
      const pageConfig = this._calculatePageLayout(layout);
      const disabledCells = new Set(labelLayout.disabledCells || []);

      // Initialisation PDF
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      // 🎯 Génération page par page
      let labelIndex = 0;
      let currentPage = 0;

      while (labelIndex < duplicatedLabels.length) {
        if (currentPage > 0) doc.addPage();

        labelIndex = await this._renderPage(
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

      // Sauvegarde
      const filename = `${title}_A4_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename);

      return { success: true, filename, pages: currentPage, labels: duplicatedLabels.length };
    } catch (error) {
      console.error('❌ Erreur export PDF A4:', error);
      throw error;
    }
  }

  // 🎯 Rendu d'une page A4 optimisé
  async _renderPage(doc, labels, startIndex, layout, style, pageConfig, disabledCells) {
    let cellIndex = 0;
    let labelIndex = startIndex;
    let labelsOnPage = 0;

    while (
      cellIndex < pageConfig.labelsPerPage &&
      labelIndex < labels.length &&
      labelsOnPage < pageConfig.labelsPerPage
    ) {
      // Skip cellules désactivées
      if (disabledCells.has(cellIndex)) {
        cellIndex++;
        continue;
      }

      const label = labels[labelIndex];
      const position = this._calculateLabelPosition(cellIndex, pageConfig, layout);

      try {
        // Génération image étiquette
        const imgData = await this._renderSingleLabelToCanvas(label, layout, style, 'export');

        // Ajout au PDF
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
        labelsOnPage++;
      } catch (error) {
        console.warn(`⚠️ Erreur rendu étiquette ${labelIndex}:`, error);
        labelIndex++; // Skip cette étiquette et continue
      }

      cellIndex++;
    }

    return labelIndex;
  }

  // 🎯 Calcul layout page unifié
  _calculatePageLayout(layout) {
    const PAGE_WIDTH = 210;
    const PAGE_HEIGHT = 297;

    const usableWidth = PAGE_WIDTH - (layout.offsetLeft || 8) * 2;
    const usableHeight = PAGE_HEIGHT - (layout.offsetTop || 22) * 2;

    const columns = Math.max(1, Math.floor(usableWidth / (layout.width + (layout.spacingH || 0))));
    const rows = Math.max(1, Math.floor(usableHeight / (layout.height + (layout.spacingV || 0))));

    return {
      pageWidth: PAGE_WIDTH,
      pageHeight: PAGE_HEIGHT,
      columns,
      rows,
      labelsPerPage: columns * rows,
      usableWidth,
      usableHeight,
    };
  }

  // 🎯 Calcul position étiquette unifié
  _calculateLabelPosition(cellIndex, pageConfig, layout) {
    const col = cellIndex % pageConfig.columns;
    const row = Math.floor(cellIndex / pageConfig.columns);

    return {
      x: (layout.offsetLeft || 8) + col * (layout.width + (layout.spacingH || 0)),
      y: (layout.offsetTop || 22) + row * (layout.height + (layout.spacingV || 0)),
    };
  }

  // 🎯 Configurations par défaut
  _getDefaultLayout() {
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
