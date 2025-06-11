// controllers/cashierSessionController.js
const cashierSessionService = require('../services/cashierSessionService');
const lcdDisplayService = require('../services/lcdDisplayService');
const ResponseHandler = require('../handlers/ResponseHandler');

class CashierSessionController {
  // ✅ OUVRIR SESSION DE CAISSE
  async openSession(req, res) {
    try {
      const cashier = req.user; // Depuis le middleware auth
      const { lcd_port, lcd_config = {} } = req.body;

      const result = await cashierSessionService.openCashierSession(cashier, lcd_port, lcd_config);

      return ResponseHandler.success(res, {
        ...result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  // ✅ FERMER SESSION DE CAISSE
  async closeSession(req, res) {
    try {
      const cashierId = req.user.id;

      const result = await cashierSessionService.closeCashierSession(cashierId);

      return ResponseHandler.success(res, {
        ...result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  // ✅ OBTENIR STATUT SESSION
  async getSessionStatus(req, res) {
    try {
      const cashierId = req.user.id;

      const session = cashierSessionService.getCashierSession(cashierId);
      const lcdStatus = cashierSessionService.getLCDStatus();

      return ResponseHandler.success(res, {
        session,
        lcd_status: lcdStatus,
        has_session: !!session,
        can_use_lcd: session && lcdStatus.owned && lcdStatus.owner?.cashier_id === cashierId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  // ✅ DEMANDER LE CONTRÔLE LCD
  async requestLCDControl(req, res) {
    try {
      const cashier = req.user;
      const { port, config = {} } = req.body;

      if (!port) {
        return ResponseHandler.badRequest(res, 'Port LCD requis');
      }

      await cashierSessionService.assignLCDToCashier(cashier.id, cashier.username, port, config);

      return ResponseHandler.success(res, {
        message: 'Contrôle LCD acquis',
        lcd_status: cashierSessionService.getLCDStatus(),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  // ✅ LIBÉRER LE CONTRÔLE LCD
  async releaseLCDControl(req, res) {
    try {
      const cashierId = req.user.id;

      cashierSessionService.releaseLCDFromCashier(cashierId);

      return ResponseHandler.success(res, {
        message: 'Contrôle LCD libéré',
        lcd_status: cashierSessionService.getLCDStatus(),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  // ✅ UTILISER LE LCD - ÉCRITURE MESSAGE
  async writeLCDMessage(req, res) {
    try {
      const cashierId = req.user.id;
      const { line1 = '', line2 = '' } = req.body;

      const result = await cashierSessionService.writeMessage(cashierId, line1, line2);

      return ResponseHandler.success(res, {
        message: 'Message affiché sur LCD',
        content: result.content,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  // ✅ UTILISER LE LCD - PRIX
  async showLCDPrice(req, res) {
    try {
      const cashierId = req.user.id;
      const { item_name, price } = req.body;

      if (price === undefined || price === null) {
        return ResponseHandler.badRequest(res, 'Prix requis');
      }

      const result = await cashierSessionService.showPrice(
        cashierId,
        item_name || 'Article',
        price
      );

      return ResponseHandler.success(res, {
        message: 'Prix affiché sur LCD',
        content: result.content,
        item_name,
        price: parseFloat(price),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  // ✅ UTILISER LE LCD - TOTAL
  async showLCDTotal(req, res) {
    try {
      const cashierId = req.user.id;
      const { total } = req.body;

      if (total === undefined || total === null) {
        return ResponseHandler.badRequest(res, 'Total requis');
      }

      const result = await cashierSessionService.showTotal(cashierId, total);

      return ResponseHandler.success(res, {
        message: 'Total affiché sur LCD',
        content: result.content,
        total: parseFloat(total),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  // ✅ UTILISER LE LCD - MESSAGES PRÉDÉFINIS
  async showLCDWelcome(req, res) {
    try {
      const cashierId = req.user.id;
      const result = await cashierSessionService.showWelcome(cashierId);

      return ResponseHandler.success(res, {
        message: 'Message de bienvenue affiché',
        content: result.content,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async showLCDThankYou(req, res) {
    try {
      const cashierId = req.user.id;
      const result = await cashierSessionService.showThankYou(cashierId);

      return ResponseHandler.success(res, {
        message: 'Message de remerciement affiché',
        content: result.content,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async clearLCDDisplay(req, res) {
    try {
      const cashierId = req.user.id;
      const result = await cashierSessionService.clearDisplay(cashierId);

      return ResponseHandler.success(res, {
        message: 'Écran LCD effacé',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  // ✅ LISTER PORTS LCD DISPONIBLES
  async listLCDPorts(req, res) {
    try {
      const ports = await lcdDisplayService.listAvailablePorts();
      const lcdStatus = cashierSessionService.getLCDStatus();

      return ResponseHandler.success(res, {
        ports,
        lcd_status: lcdStatus,
        available_ports: ports.filter((p) => !lcdStatus.owned || lcdStatus.owner.port !== p.path),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  // ✅ OBTENIR TOUTES LES SESSIONS ACTIVES (admin)
  async getActiveSessions(req, res) {
    try {
      const sessions = cashierSessionService.getActiveSessions();
      const lcdStatus = cashierSessionService.getLCDStatus();

      return ResponseHandler.success(res, {
        active_sessions: sessions,
        lcd_status: lcdStatus,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }
}

module.exports = new CashierSessionController();
