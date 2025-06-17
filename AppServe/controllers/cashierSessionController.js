// controllers/cashierSessionController.js - AVEC ENDPOINT updateCart
const cashierSessionService = require('../services/cashierSessionService');
const lcdDisplayService = require('../services/lcdDisplayService');
const ResponseHandler = require('../handlers/ResponseHandler');

class CashierSessionController {
  // ✅ OUVRIR SESSION DE CAISSE
  async openSession(req, res) {
    try {
      const cashier = req.user; // Depuis le middleware auth
      const { lcd_port, lcd_config = {}, drawer } = req.body; // ✅ NOUVEAU : drawer

      // ✅ NOUVEAU : Validation drawer obligatoire
      if (!drawer || !drawer.opening_amount || drawer.opening_amount <= 0) {
        return ResponseHandler.badRequest(res, 'Données du fond de caisse obligatoires');
      }

      const result = await cashierSessionService.openCashierSession(
        cashier,
        lcd_port,
        lcd_config,
        drawer
      );

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

      console.log(`🔄 [CONTROLLER] Fermeture session simple pour cashier ${cashierId}`);

      // ✅ Utiliser la même méthode mais sans données de fermeture
      const result = await cashierSessionService.closeCashierSession(cashierId);

      return ResponseHandler.success(res, {
        ...result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error(`❌ [CONTROLLER] Erreur fermeture session simple:`, error);
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

  // ✅ NOUVEAU : ENDPOINT POUR MISE À JOUR PANIER
  async updateCart(req, res) {
    try {
      const cashierId = req.user.id;
      const { item_count, total } = req.body;

      console.info(
        `🛒 [API] Réception mise à jour panier: cashier=${cashierId}, items=${item_count}, total=${total}€`
      );

      // Validation des paramètres
      if (typeof item_count !== 'number' || typeof total !== 'number') {
        return ResponseHandler.badRequest(res, 'item_count et total doivent être des nombres');
      }

      if (item_count < 0 || total < 0) {
        return ResponseHandler.badRequest(res, 'item_count et total ne peuvent pas être négatifs');
      }

      // ✅ NOTIFICATION AU SERVICE POUR MISE À JOUR LCD AUTOMATIQUE
      await cashierSessionService.notifyCartChange(cashierId, item_count, total);

      return ResponseHandler.success(res, {
        message: 'Panier mis à jour avec succès',
        cart: {
          item_count,
          total: parseFloat(total.toFixed(2)),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error(`❌ [API] Erreur mise à jour panier:`, error);
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

  // ✅ NOUVEAU : DEBUG - OBTENIR L'ÉTAT DU PANIER D'UN CAISSIER
  async getCartStatus(req, res) {
    try {
      const cashierId = req.user.id;
      const cart = cashierSessionService.getCashierCart(cashierId);

      return ResponseHandler.success(res, {
        cashier_id: cashierId,
        cart,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async addCashMovement(cashierId, movementData) {
    try {
      // Validation des données
      if (!movementData.type || !['in', 'out'].includes(movementData.type)) {
        throw new Error('Type de mouvement invalide (in/out requis)');
      }

      if (!movementData.amount || movementData.amount <= 0) {
        throw new Error('Montant invalide');
      }

      if (!movementData.reason || movementData.reason.trim() === '') {
        throw new Error('Raison du mouvement requise');
      }

      const result = await cashierSessionService.addCashMovement(cashierId, {
        type: movementData.type,
        amount: parseFloat(movementData.amount),
        reason: movementData.reason.trim(),
        notes: movementData.notes ? movementData.notes.trim() : null,
      });

      return {
        message: `Mouvement ${movementData.type === 'in' ? 'entrée' : 'sortie'} enregistré`,
        movement: result.movement,
        new_balance: result.new_balance,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`❌ [CONTROLLER] Erreur mouvement caisse:`, error);
      throw error;
    }
  }

  // ✅ NOUVEAU : Obtenir fond de caisse
  getCashierDrawer(cashierId) {
    try {
      const drawer = cashierSessionService.getCashierDrawer(cashierId);

      if (!drawer) {
        return null;
      }

      return {
        ...drawer,
        variance: drawer.current_amount - drawer.expected_amount,
        is_balanced: Math.abs(drawer.current_amount - drawer.expected_amount) < 0.01,
      };
    } catch (error) {
      console.error(`❌ [CONTROLLER] Erreur récupération fond:`, error);
      throw error;
    }
  }

  // ✅ NOUVEAU : Fermer session avec fond de caisse
  async closeCashierSessionWithDrawer(req, res) {
    try {
      const cashierId = req.user.id;
      const closingData = req.body;

      console.log(
        `🔄 [CONTROLLER] Fermeture session avec fond pour cashier ${cashierId}:`,
        closingData
      );

      // Validation données fermeture
      if (closingData.counted_amount !== undefined && closingData.counted_amount < 0) {
        return ResponseHandler.badRequest(res, 'Montant compté invalide');
      }

      // ✅ IMPORTANT : Appeler la méthode du service avec les bonnes données
      const result = await cashierSessionService.closeCashierSession(cashierId, {
        counted_amount: closingData.counted_amount,
        expected_amount: closingData.expected_amount,
        method: closingData.method || 'custom',
        notes: closingData.notes ? closingData.notes.trim() : null,
        variance_accepted: closingData.variance_accepted || false,
        variance: closingData.variance || 0,
      });

      console.log(`✅ [CONTROLLER] Session fermée avec succès pour cashier ${cashierId}`);

      return ResponseHandler.success(res, {
        message: 'Session et fond de caisse fermés',
        session: result.session,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error(`❌ [CONTROLLER] Erreur fermeture session+fond:`, error);
      return ResponseHandler.error(res, error);
    }
  }
}

module.exports = new CashierSessionController();
