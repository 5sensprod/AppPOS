// controllers/lcdController.js - Version optimisée
const lcdDisplayService = require('../services/lcdDisplayService');
const ResponseHandler = require('../handlers/ResponseHandler');

class LCDController {
  constructor() {
    // Registre des connexions actives pour éviter les conflits
    this.activeConnections = new Map();
    this.sessionTimeouts = new Map();
  }
  async connect(req, res) {
    try {
      const { port_path, config = {} } = req.body;
      if (!port_path) {
        return ResponseHandler.badRequest(res, 'Le chemin du port est requis');
      }

      // Vérifier si le port est déjà utilisé
      const existingConnection = this.activeConnections.get(port_path);
      if (existingConnection) {
        // Vérifier si la session est encore active
        const isStillActive = await this.checkSessionActive(existingConnection);

        if (isStillActive) {
          return ResponseHandler.error(
            res,
            new Error(
              `Port ${port_path} déjà utilisé par une autre instance. ` +
                `Connecté depuis ${existingConnection.connectedAt} ` +
                `(Client: ${existingConnection.clientType})`
            ),
            409
          ); // Conflict
        } else {
          // Nettoyer la session expirée
          this.cleanupExpiredSession(port_path);
        }
      }

      // Détecter le type de client (Electron vs Navigateur)
      const clientType = this.detectClientType(req);

      // Tentative de connexion
      const result = await lcdDisplayService.connectToDisplay(port_path, config);

      // Enregistrer la connexion active
      const sessionId = this.generateSessionId();
      this.activeConnections.set(port_path, {
        sessionId,
        clientType,
        userAgent: req.headers['user-agent'],
        connectedAt: new Date().toISOString(),
        lastActivity: Date.now(),
        config: result.config,
      });

      // Configurer le timeout de session
      this.setupSessionTimeout(port_path, sessionId);

      return ResponseHandler.success(res, {
        message: result.message,
        connection: {
          port: port_path,
          config: result.config,
          status: 'connected',
          sessionId,
          clientType,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      // Analyser l'erreur pour donner un message plus précis
      const detailedError = this.analyzeConnectionError(error, req.body.port_path);
      return ResponseHandler.error(res, detailedError);
    }
  }

  async disconnect(req, res) {
    try {
      const currentPort = lcdDisplayService.getStatus()?.display?.path;

      if (currentPort) {
        // Nettoyer la session
        this.cleanupSession(currentPort);
      }

      lcdDisplayService.disconnect();

      return ResponseHandler.success(res, {
        message: 'Écran LCD déconnecté',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async getStatus(req, res) {
    try {
      const status = lcdDisplayService.getStatus();
      const currentPort = status.display?.path;

      // Ajouter les informations de session si connecté
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
      const ports = await lcdDisplayService.listAvailablePorts();

      // Enrichir avec les informations de disponibilité
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

  async reconnectLCD(req, res) {
    try {
      const result = await lcdDisplayService.manualReconnect();

      return ResponseHandler.success(res, {
        message: 'Reconnexion LCD réussie',
        connection: result,
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
    return `lcd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  analyzeConnectionError(error, portPath) {
    const errorMessage = error.message.toLowerCase();

    if (errorMessage.includes('command failed') && errorMessage.includes('mode')) {
      return new Error(
        `Impossible de configurer le port ${portPath}. ` +
          `Ce port est probablement utilisé par une autre application ` +
          `(Electron, navigateur, ou logiciel tiers). ` +
          `Fermez les autres instances ou utilisez un port différent.`
      );
    }

    if (errorMessage.includes('access denied') || errorMessage.includes('permission denied')) {
      return new Error(
        `Accès refusé au port ${portPath}. ` +
          `Vérifiez que le port n'est pas utilisé par une autre application.`
      );
    }

    if (errorMessage.includes('device not found') || errorMessage.includes('no such file')) {
      return new Error(
        `Port ${portPath} introuvable. ` +
          `Vérifiez que l'écran LCD est connecté et que les drivers sont installés.`
      );
    }

    return new Error(
      `Erreur de connexion sur ${portPath}: ${error.message}. ` +
        `Vérifiez que le port n'est pas utilisé ailleurs.`
    );
  }

  async checkSessionActive(sessionInfo) {
    // Session active si dernière activité < 30 secondes
    return Date.now() - sessionInfo.lastActivity < 30000;
  }

  setupSessionTimeout(portPath, sessionId) {
    // Nettoyer automatiquement après 5 minutes d'inactivité
    const timeoutId = setTimeout(
      () => {
        const session = this.activeConnections.get(portPath);
        if (session && session.sessionId === sessionId) {
          console.log(`Session expirée pour le port ${portPath}`);
          this.cleanupSession(portPath);
          lcdDisplayService.disconnect();
        }
      },
      5 * 60 * 1000
    ); // 5 minutes

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

  // Middleware pour mettre à jour l'activité de session
  updateSessionActivity(req, res, next) {
    const status = lcdDisplayService.getStatus();
    const currentPort = status?.display?.path;

    if (currentPort && this.activeConnections.has(currentPort)) {
      const session = this.activeConnections.get(currentPort);
      session.lastActivity = Date.now();
    }

    next();
  }

  async writeMessage(req, res) {
    try {
      const { line1 = '', line2 = '' } = req.body;
      const result = await lcdDisplayService.writeToDisplay(line1, line2);
      return ResponseHandler.success(res, {
        message: result.message,
        content: result.content,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async clearDisplay(req, res) {
    try {
      await lcdDisplayService.clearDisplay();
      return ResponseHandler.success(res, {
        message: 'Écran effacé',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async showPrice(req, res) {
    try {
      const { item_name, price } = req.body;
      if (price === undefined || price === null) {
        return ResponseHandler.badRequest(res, 'Le prix est requis');
      }

      const result = await lcdDisplayService.showPrice(item_name || 'Article', price);
      return ResponseHandler.success(res, {
        message: 'Prix affiché',
        content: result.content,
        item_name,
        price: parseFloat(price),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async showTotal(req, res) {
    try {
      const { total } = req.body;
      if (total === undefined || total === null) {
        return ResponseHandler.badRequest(res, 'Le total est requis');
      }

      const result = await lcdDisplayService.showTotal(total);
      return ResponseHandler.success(res, {
        message: 'Total affiché',
        content: result.content,
        total: parseFloat(total),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async showWelcome(req, res) {
    try {
      const result = await lcdDisplayService.showWelcomeMessage();
      return ResponseHandler.success(res, {
        message: 'Message de bienvenue affiché',
        content: result.content,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async showThankYou(req, res) {
    try {
      const result = await lcdDisplayService.showThankYou();
      return ResponseHandler.success(res, {
        message: 'Message de remerciement affiché',
        content: result.content,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async showError(req, res) {
    try {
      const { error_message = 'Erreur' } = req.body;
      const result = await lcdDisplayService.showError(error_message);
      return ResponseHandler.success(res, {
        message: "Message d'erreur affiché",
        content: result.content,
        error_message,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async testDisplay(req, res) {
    try {
      const testSequence = [
        { line1: 'TEST LCD', line2: 'Demarrage...' },
        { line1: 'Test caracteres', line2: 'ABCDEFGHIJ1234567890' },
        { line1: 'Prix test', line2: '99.99EUR' },
        { line1: 'TOTAL', line2: '156.78EUR' },
        { line1: 'Test termine', line2: 'Succes !' },
      ];

      const results = [];
      for (const [index, test] of testSequence.entries()) {
        const result = await lcdDisplayService.writeToDisplay(test.line1, test.line2);
        results.push({
          step: index + 1,
          content: result.content,
          success: result.success,
        });
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      await lcdDisplayService.showWelcomeMessage();
      return ResponseHandler.success(res, {
        message: 'Test complet terminé',
        test_results: results,
        total_steps: testSequence.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }
}

module.exports = LCDController;
