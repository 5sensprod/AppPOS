// ===== 2. CONTRÔLEUR - controllers/labelPrintingController.js =====
const labelPrintingService = require('../services/labelPrintingService');

class LabelPrintingController {
  /**
   * Impression directe des étiquettes
   */
  async printLabels(req, res) {
    try {
      const {
        images, // Array d'images base64 générées par Fabric.js
        printerName, // Nom de l'imprimante (optionnel)
        layout, // Configuration layout (width, height, etc.)
        copies = 1, // Nombre de copies
      } = req.body;

      console.log(`🖨️ [PRINT] Demande d'impression de ${images.length} étiquettes`);

      // Validation
      if (!images || !Array.isArray(images) || images.length === 0) {
        return res.status(400).json({
          success: false,
          error: "Aucune image d'étiquette fournie",
        });
      }

      // Lancer l'impression
      const result = await labelPrintingService.printLabels({
        images,
        printerName,
        layout,
        copies,
      });

      res.json({
        success: true,
        message: `${images.length} étiquette(s) envoyée(s) à l'impression`,
        details: result,
      });
    } catch (error) {
      console.error('❌ [PRINT] Erreur impression:', error);
      res.status(500).json({
        success: false,
        error: "Erreur lors de l'impression",
        details: error.message,
      });
    }
  }

  /**
   * Obtenir les imprimantes disponibles
   */
  async getAvailablePrinters(req, res) {
    try {
      const printers = await labelPrintingService.getAvailablePrinters();

      res.json({
        success: true,
        printers,
      });
    } catch (error) {
      console.error('❌ [PRINT] Erreur récupération imprimantes:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la récupération des imprimantes',
        details: error.message,
      });
    }
  }

  /**
   * Tester une imprimante avec une page de test
   */
  async testPrinter(req, res) {
    try {
      const { printerName } = req.body;

      const result = await labelPrintingService.testPrinter(printerName);

      res.json({
        success: true,
        message: "Test d'impression envoyé",
        details: result,
      });
    } catch (error) {
      console.error('❌ [PRINT] Erreur test imprimante:', error);
      res.status(500).json({
        success: false,
        error: "Erreur lors du test d'impression",
        details: error.message,
      });
    }
  }

  /**
   * Obtenir les paramètres d'impression
   */
  async getPrintSettings(req, res) {
    try {
      const settings = await labelPrintingService.getPrintSettings();

      res.json({
        success: true,
        settings,
      });
    } catch (error) {
      console.error('❌ [PRINT] Erreur paramètres:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la récupération des paramètres',
        details: error.message,
      });
    }
  }
}

module.exports = new LabelPrintingController();
