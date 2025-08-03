//services/fabricExportService.js
import A4LabelRenderer from '../components/common/EntityTable/components/BatchActions/components/ExportLabels/services/A4LabelRenderer.js';
import RollLabelRenderer from '../components/common/EntityTable/components/BatchActions/components/ExportLabels/services/RollLabelRenderer.js';

class FabricExportService {
  async exportLabelsToPDF(exportConfig) {
    try {
      this._validateExportConfig(exportConfig);

      const { labelLayout } = exportConfig;
      const supportType = labelLayout?.layout?.supportType || 'A4';

      switch (supportType) {
        case 'A4':
        case 'custom':
          return await A4LabelRenderer.exportLabelsToPDF(exportConfig);

        case 'rouleau':
          return await RollLabelRenderer.exportLabelsToPDF(exportConfig);

        default:
          throw new Error(`Type de support non supporté: ${supportType}`);
      }
    } catch (error) {
      console.error('Erreur dans fabricExportService.exportLabelsToPDF:', error);
      throw error;
    }
  }

  async renderLabelPreview(canvasElement, label, layout, style, options = {}) {
    try {
      const supportType = layout?.supportType || 'A4';

      switch (supportType) {
        case 'A4':
        case 'custom':
          return await A4LabelRenderer.renderToCanvas(canvasElement, label, layout, style, options);

        case 'rouleau':
          return await RollLabelRenderer.renderToCanvas(
            canvasElement,
            label,
            layout,
            style,
            options
          );

        default:
          throw new Error(`Type de support non supporté pour l'aperçu: ${supportType}`);
      }
    } catch (error) {
      console.error('Erreur dans fabricExportService.renderLabelPreview:', error);
      throw error;
    }
  }

  _validateExportConfig(config) {
    if (!config) {
      throw new Error("Configuration d'export manquante");
    }

    if (!config.labelData || !Array.isArray(config.labelData) || config.labelData.length === 0) {
      throw new Error("Données d'étiquettes manquantes ou vides");
    }

    if (!config.labelLayout) {
      throw new Error('Configuration de layout manquante');
    }

    if (!config.title || typeof config.title !== 'string') {
      throw new Error('Titre du document manquant');
    }
  }
}

export default new FabricExportService();
