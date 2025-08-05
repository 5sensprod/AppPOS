const labelPrintingService = require('../services/labelPrintingService');

class LabelPrintingController {
  // Gestionnaire d'erreur générique
  #handleError(res, error, message = "Erreur d'impression") {
    res.status(500).json({ error: message, details: error.message });
  }

  // Impression principale
  async printLabels(req, res) {
    try {
      const { images, printerName, layout, copies = 1 } = req.body;

      if (!images?.length) {
        return res.status(400).json({ error: 'Aucune image fournie' });
      }

      const result = await labelPrintingService.printLabels({
        images,
        printerName,
        layout,
        copies,
      });

      res.json(result);
    } catch (error) {
      this.#handleError(res, error, 'Erreur impression');
    }
  }

  // Liste des imprimantes
  async getAvailablePrinters(req, res) {
    try {
      const printers = await labelPrintingService.getAvailablePrinters();
      res.json({ printers });
    } catch (error) {
      this.#handleError(res, error, 'Erreur récupération imprimantes');
    }
  }

  // Test imprimante (optionnel - peut être supprimé si inutilisé)
  async testPrinter(req, res) {
    try {
      const { printerName } = req.body;
      const result = await labelPrintingService.testPrinter(printerName);
      res.json(result);
    } catch (error) {
      this.#handleError(res, error, 'Erreur test imprimante');
    }
  }

  // Paramètres statiques (peut être supprimé si non utilisé)
  getPrintSettings(req, res) {
    const settings = labelPrintingService.getPrintSettings();
    res.json({ settings });
  }
}

module.exports = new LabelPrintingController();
