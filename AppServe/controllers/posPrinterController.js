// controllers/posPrinterController.js
const posPrinterService = require('../services/posPrinterService');
const ResponseHandler = require('../handlers/ResponseHandler');

class POSPrinterController {
  constructor() {
    this.activeConnections = new Map();
    this.sessionTimeouts = new Map();
    this.service = posPrinterService;
  }

  async connect(req, res) {
    const { printerName } = req.body;
    if (!printerName) {
      return res.status(400).json({ success: false, error: 'printerName requis' });
    }

    try {
      const result = await this.service.connectToPrinter(printerName);
      return res.json(result);
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  async disconnect(req, res) {
    try {
      const currentPort = posPrinterService.getStatus()?.printer?.path;
      if (currentPort) {
        this.cleanupSession(currentPort);
      }
      posPrinterService.disconnect();

      return ResponseHandler.success(res, {
        message: 'Imprimante POS déconnectée',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async getStatus(req, res) {
    try {
      const status = posPrinterService.getStatus();
      const currentPort = status.printer?.path;

      if (currentPort && this.activeConnections.has(currentPort)) {
        const sessionInfo = this.activeConnections.get(currentPort);
        status.session = {
          clientType: sessionInfo.clientType,
          connectedAt: sessionInfo.connectedAt,
          sessionId: sessionInfo.sessionId,
        };
      }

      return ResponseHandler.success(res, {
        status,
        activeConnections: this.getActiveConnectionsSummary(),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async listPorts(req, res) {
    try {
      const ports = await posPrinterService.listAvailablePrinters();

      const enrichedPorts = ports.map((port) => ({
        ...port,
        available: !this.activeConnections.has(port.path),
        usedBy: this.activeConnections.get(port.path)?.clientType || null,
        lastActivity: this.activeConnections.get(port.path)?.connectedAt || null,
      }));

      return ResponseHandler.success(res, {
        message: `${enrichedPorts.length} port(s) détecté(s)`,
        ports: enrichedPorts,
        platform: process.platform,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async printText(req, res) {
    try {
      const { text, options = {} } = req.body;
      if (!text) {
        return ResponseHandler.badRequest(res, 'Le texte est requis');
      }

      const result = await posPrinterService.printText(text, options);
      return ResponseHandler.success(res, {
        message: result.message,
        content: result.content,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async printLine(req, res) {
    try {
      const { left_text = '', right_text = '', separator = '.' } = req.body;

      const result = await posPrinterService.printLine(left_text, right_text, separator);
      return ResponseHandler.success(res, {
        message: result.message,
        content: result.content,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async printReceipt(req, res) {
    try {
      const { items, options = {} } = req.body;
      if (!items || !Array.isArray(items)) {
        return ResponseHandler.badRequest(res, 'La liste des articles est requise');
      }

      const result = await posPrinterService.printReceipt(items, options);
      return ResponseHandler.success(res, {
        message: result.message,
        total: result.total,
        itemCount: result.itemCount,
        effectiveWidth: result.effectiveWidth,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async cutPaper(req, res) {
    try {
      const { full_cut = false } = req.body;

      const result = await posPrinterService.cutPaper(full_cut);
      return ResponseHandler.success(res, {
        message: result.message,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async feedPaper(req, res) {
    try {
      const { lines = 3 } = req.body;

      const result = await posPrinterService.feedPaper(lines);
      return ResponseHandler.success(res, {
        message: result.message,
        lines,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async openCashDrawer(req, res) {
    try {
      const result = await posPrinterService.openCashDrawer();
      return ResponseHandler.success(res, {
        message: result.message,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async printBarcode(req, res) {
    try {
      const { data, type = 'CODE128' } = req.body;
      if (!data) {
        return ResponseHandler.badRequest(res, 'Les données du code-barres sont requises');
      }

      const result = await posPrinterService.printBarcode(data, type);
      return ResponseHandler.success(res, {
        message: result.message,
        barcode: { data: result.data, type: result.type },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async testPrinter(req, res) {
    try {
      const result = await posPrinterService.testPrinter();
      return ResponseHandler.success(res, {
        message: result.message,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  // === NOUVELLE MÉTHODE : CALIBRATION ===

  async calibratePrinter(req, res) {
    try {
      const { paperWidth = 80, fontSize = 10 } = req.body;

      const result = await posPrinterService.calibratePrinter(paperWidth, fontSize);
      return ResponseHandler.success(res, {
        message: result.message,
        instructions: result.instructions,
        testedWidths: result.testedWidths,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  // === MÉTHODES UTILITAIRES ===
  detectClientType(req) {
    const userAgent = req.headers['user-agent'] || '';
    if (userAgent.includes('Electron')) {
      return 'Electron Desktop';
    } else if (userAgent.includes('Chrome')) {
      return 'Navigateur Web';
    } else {
      return 'Client inconnu';
    }
  }

  generateSessionId() {
    return `printer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async checkSessionActive(sessionInfo) {
    return Date.now() - sessionInfo.lastActivity < 30000;
  }

  setupSessionTimeout(portPath, sessionId) {
    const timeoutId = setTimeout(
      () => {
        const session = this.activeConnections.get(portPath);
        if (session && session.sessionId === sessionId) {
          console.log(`Session imprimante expirée pour le port ${portPath}`);
          this.cleanupSession(portPath);
          posPrinterService.disconnect();
        }
      },
      5 * 60 * 1000
    );

    this.sessionTimeouts.set(portPath, timeoutId);
  }

  cleanupSession(portPath) {
    this.activeConnections.delete(portPath);
    const timeoutId = this.sessionTimeouts.get(portPath);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.sessionTimeouts.delete(portPath);
    }
  }

  cleanupExpiredSession(portPath) {
    this.cleanupSession(portPath);
  }

  getActiveConnectionsSummary() {
    return Array.from(this.activeConnections.entries()).map(([port, info]) => ({
      port,
      clientType: info.clientType,
      connectedAt: info.connectedAt,
      sessionId: info.sessionId,
    }));
  }

  updateSessionActivity(req, res, next) {
    const status = posPrinterService.getStatus();
    const currentPort = status?.printer?.path;

    if (currentPort && this.activeConnections.has(currentPort)) {
      const session = this.activeConnections.get(currentPort);
      session.lastActivity = Date.now();
    }

    next();
  }
}

module.exports = POSPrinterController;
