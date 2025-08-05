// services/fabricExportService.js - VERSION OPTIMISÉE
import A4LabelRenderer from '../components/common/EntityTable/components/BatchActions/components/ExportLabels/services/A4LabelRenderer.js';
import RollLabelRenderer from '../components/common/EntityTable/components/BatchActions/components/ExportLabels/services/RollLabelRenderer.js';

class FabricExportService {
  // 🎯 Sélecteur de renderer unifié
  #getRenderer(supportType) {
    switch (supportType) {
      case 'rouleau':
        return RollLabelRenderer;
      case 'A4':
      case 'custom':
      default:
        return A4LabelRenderer;
    }
  }

  // 🚀 Export PDF simplifié
  async exportLabelsToPDF(exportConfig) {
    try {
      this.#validateExportConfig(exportConfig);

      const supportType = exportConfig.labelLayout?.layout?.supportType || 'A4';
      const renderer = this.#getRenderer(supportType);

      console.log(`📄 Export PDF ${supportType} avec ${exportConfig.labelData.length} étiquettes`);

      return await renderer.exportLabelsToPDF(exportConfig);
    } catch (error) {
      console.error('❌ Erreur export PDF:', error);
      throw error;
    }
  }

  // 🎨 Aperçu canvas simplifié
  async renderLabelPreview(canvasElement, label, layout, style, options = {}) {
    try {
      const supportType = layout?.supportType || 'A4';
      const renderer = this.#getRenderer(supportType);

      return await renderer.renderToCanvas(canvasElement, label, layout, style, options);
    } catch (error) {
      console.error('❌ Erreur aperçu canvas:', error);
      throw error;
    }
  }

  // 🔍 Validation allégée et tolérante
  #validateExportConfig(config) {
    if (!config?.labelData?.length) {
      throw new Error("Aucune donnée d'étiquette à exporter");
    }

    if (!config.labelLayout?.layout) {
      throw new Error('Configuration de layout manquante');
    }

    if (!config.title?.trim()) {
      throw new Error('Titre du document requis');
    }
  }

  // 🆕 Méthode utilitaire pour obtenir les infos du renderer
  getRendererInfo(supportType) {
    const renderer = this.#getRenderer(supportType);
    return {
      type: supportType,
      renderer: renderer.constructor.name,
      isRoll: supportType === 'rouleau',
    };
  }
}

export default new FabricExportService();
