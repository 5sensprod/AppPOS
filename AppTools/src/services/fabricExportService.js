// fabricExportService.js - Version Canvas-to-PDF
import LabelRenderer from './LabelRenderer.js';

class FabricExportService {
  async exportLabelsToPDF(exportConfig) {
    // ✅ Délégation complète au LabelRenderer unifié
    return await LabelRenderer.exportLabelsToPDF(exportConfig);
  }
}

export default new FabricExportService();
