// services/cashierSessionService.js - API INTELLIGENTE avec gestion auto LCD
const lcdDisplayService = require('./lcdDisplayService');

class CashierSessionService {
  constructor() {
    this.activeSessions = new Map(); // cashier_id -> session data
    this.lcdOwnership = null; // { cashier_id, username, startTime, port }

    // ✅ NOUVEAU : État du panier par caissier pour gestion auto LCD
    this.cashierCarts = new Map(); // cashier_id -> { itemCount, total, lastUpdate }
  }

  // ✅ OUVRIR UNE SESSION DE CAISSE
  async openCashierSession(cashier, lcdPort = null, lcdConfig = {}) {
    const cashierId = cashier.id;
    const username = cashier.username;

    console.info(`🏪 Ouverture session caisse pour ${username}`);

    // Vérifier si une session existe déjà pour ce caissier
    if (this.activeSessions.has(cashierId)) {
      const existingSession = this.activeSessions.get(cashierId);
      return {
        success: true,
        message: 'Session déjà active',
        session: existingSession,
        resumed: true,
      };
    }

    // Créer la session
    const session = {
      cashier_id: cashierId,
      username,
      startTime: new Date(),
      status: 'active',
      sales_count: 0,
      total_sales: 0,
      lcd: {
        requested: !!lcdPort,
        connected: false,
        port: null,
        error: null,
      },
    };

    // ✅ NOUVEAU : Initialiser l'état panier pour ce caissier
    this.cashierCarts.set(cashierId, {
      itemCount: 0,
      total: 0.0,
      lastUpdate: new Date(),
    });

    // Tentative de prise de contrôle LCD si demandé
    if (lcdPort) {
      try {
        await this.assignLCDToCashier(cashierId, username, lcdPort, lcdConfig);
        session.lcd.connected = true;
        session.lcd.port = lcdPort;

        // ✅ AFFICHAGE WELCOME INITIAL (API-CONTROLLED)
        console.info(`👋 [API] Affichage welcome initial pour ${username}`);
        await lcdDisplayService.showWelcomeMessage();
      } catch (error) {
        session.lcd.error = error.message;
        console.warn(`⚠️ LCD non disponible pour ${username}:`, error.message);
      }
    }

    this.activeSessions.set(cashierId, session);

    return {
      success: true,
      message: 'Session caissier ouverte',
      session,
      lcd_status: session.lcd,
    };
  }

  // ✅ ASSIGNER LE LCD À UN CAISSIER
  async assignLCDToCashier(cashierId, username, lcdPort, lcdConfig = {}) {
    // Vérifier si LCD déjà utilisé par un autre caissier
    if (this.lcdOwnership && this.lcdOwnership.cashier_id !== cashierId) {
      const currentOwner = this.lcdOwnership;
      throw new Error(
        `LCD utilisé par ${currentOwner.username} depuis ${currentOwner.startTime.toLocaleTimeString()}`
      );
    }

    try {
      // Connecter le LCD
      const result = await lcdDisplayService.connectToDisplay(lcdPort, lcdConfig);

      // Enregistrer la propriété
      this.lcdOwnership = {
        cashier_id: cashierId,
        username,
        startTime: new Date(),
        port: lcdPort,
        config: lcdConfig,
      };

      console.info(`📺 LCD assigné à ${username} sur ${lcdPort}`);

      // ✅ PAS de message de session ici - laissons le welcome normal
      return result;
    } catch (error) {
      throw new Error(`Impossible de connecter LCD: ${error.message}`);
    }
  }

  // ✅ LIBÉRER LE LCD D'UN CAISSIER
  releaseLCDFromCashier(cashierId) {
    if (this.lcdOwnership && this.lcdOwnership.cashier_id === cashierId) {
      const owner = this.lcdOwnership;

      try {
        lcdDisplayService.disconnect();
        console.info(`📺 LCD libéré de ${owner.username}`);
      } catch (error) {
        console.warn('Erreur lors de la libération LCD:', error.message);
      }

      this.lcdOwnership = null;

      // Mettre à jour la session
      if (this.activeSessions.has(cashierId)) {
        const session = this.activeSessions.get(cashierId);
        session.lcd.connected = false;
        session.lcd.port = null;
      }

      // ✅ NOUVEAU : Nettoyer l'état panier
      this.cashierCarts.delete(cashierId);
    }
  }

  // ✅ FERMER SESSION CAISSIER
  async closeCashierSession(cashierId) {
    const session = this.activeSessions.get(cashierId);

    if (!session) {
      throw new Error('Aucune session active trouvée');
    }

    console.info(`🏪 Fermeture session caisse pour ${session.username}`);

    // Libérer le LCD si possédé
    this.releaseLCDFromCashier(cashierId);

    // Marquer la session comme fermée
    session.status = 'closed';
    session.endTime = new Date();
    session.duration = session.endTime - session.startTime;

    // Retirer de la liste active
    this.activeSessions.delete(cashierId);

    // ✅ NOUVEAU : Nettoyer l'état panier
    this.cashierCarts.delete(cashierId);

    return {
      success: true,
      message: 'Session fermée',
      session,
    };
  }

  // ✅ NOUVEAU : MISE À JOUR INTELLIGENTE DU PANIER
  async updateCashierCart(cashierId, itemCount, total) {
    if (!this.activeSessions.has(cashierId)) {
      console.debug(`⚠️ [API] Pas de session pour cashier ${cashierId}`);
      return;
    }

    if (!this.lcdOwnership || this.lcdOwnership.cashier_id !== cashierId) {
      console.debug(`⚠️ [API] LCD non contrôlé par cashier ${cashierId}`);
      return;
    }

    const currentCart = this.cashierCarts.get(cashierId) || { itemCount: 0, total: 0 };

    // ✅ Vérifier si le panier a vraiment changé
    if (currentCart.itemCount === itemCount && Math.abs(currentCart.total - total) < 0.01) {
      console.debug(`⏭️ [API] Panier inchangé pour ${cashierId}`);
      return;
    }

    // ✅ Mettre à jour l'état
    this.cashierCarts.set(cashierId, {
      itemCount,
      total,
      lastUpdate: new Date(),
    });

    try {
      // ✅ GESTION INTELLIGENTE SELON L'ÉTAT DU PANIER
      if (itemCount === 0) {
        console.info(`👋 [API] Panier vide -> Welcome pour ${this.lcdOwnership.username}`);
        await lcdDisplayService.showWelcomeMessage();
      } else {
        console.info(`📱 [API] Résumé panier -> ${itemCount} articles, ${total.toFixed(2)}€`);
        await lcdDisplayService.writeToDisplay(`Qte: ${itemCount}`, `${total.toFixed(2)}EUR`);
      }
    } catch (error) {
      console.warn(`⚠️ [API] Erreur mise à jour LCD:`, error.message);
    }
  }

  // ✅ UTILISER LE LCD (avec vérification de propriété)
  async useLCD(cashierId, operation) {
    // Vérifier que le caissier possède le LCD
    if (!this.lcdOwnership || this.lcdOwnership.cashier_id !== cashierId) {
      throw new Error('LCD non assigné à ce caissier');
    }

    // Vérifier que la session est active
    if (!this.activeSessions.has(cashierId)) {
      throw new Error('Aucune session caissier active');
    }

    try {
      return await operation();
    } catch (error) {
      // Si erreur de connexion LCD, marquer comme déconnecté
      if (error.message.includes('non connecté')) {
        const session = this.activeSessions.get(cashierId);
        if (session) {
          session.lcd.connected = false;
          session.lcd.error = 'Connexion perdue';
        }
      }
      throw error;
    }
  }

  // ✅ METHODS PROXY POUR LCD
  async writeMessage(cashierId, line1, line2) {
    return await this.useLCD(cashierId, () => lcdDisplayService.writeToDisplay(line1, line2));
  }

  async showPrice(cashierId, itemName, price) {
    return await this.useLCD(cashierId, () => lcdDisplayService.showPrice(itemName, price));
  }

  async showTotal(cashierId, total) {
    return await this.useLCD(cashierId, () => lcdDisplayService.showTotal(total));
  }

  async showWelcome(cashierId) {
    return await this.useLCD(cashierId, () => lcdDisplayService.showWelcomeMessage());
  }

  async showThankYou(cashierId) {
    return await this.useLCD(cashierId, () => lcdDisplayService.showThankYou());
  }

  async clearDisplay(cashierId) {
    return await this.useLCD(cashierId, () => lcdDisplayService.clearDisplay());
  }

  // ✅ OBTENIR INFO SESSION
  getCashierSession(cashierId) {
    return this.activeSessions.get(cashierId) || null;
  }

  // ✅ OBTENIR INFO LCD
  getLCDStatus() {
    return {
      owned: !!this.lcdOwnership,
      owner: this.lcdOwnership,
      display_status: lcdDisplayService.getStatus(),
    };
  }

  // ✅ LISTER TOUTES LES SESSIONS ACTIVES
  getActiveSessions() {
    return Array.from(this.activeSessions.values());
  }

  // ✅ NOUVEAU : STATS POUR UN CAISSIER AVEC MISE À JOUR AUTO LCD
  updateSaleStats(cashierId, saleAmount) {
    const session = this.activeSessions.get(cashierId);
    if (session) {
      session.sales_count++;
      session.total_sales += saleAmount;
      session.last_sale = new Date();

      // ✅ MISE À JOUR AUTO : Panier vide après vente
      console.info(`💳 [API] Vente terminée -> Retour panier vide pour ${session.username}`);
      this.updateCashierCart(cashierId, 0, 0.0);
    }
  }

  // ✅ NOUVEAU : MÉTHODE POUR SIMULER LA MISE À JOUR PANIER DEPUIS FRONTEND
  async notifyCartChange(cashierId, itemCount, total) {
    console.info(
      `🛒 [API] Notification changement panier: ${itemCount} articles, ${total.toFixed(2)}€`
    );
    await this.updateCashierCart(cashierId, itemCount, total);
  }

  // ✅ NOUVEAU : OBTENIR L'ÉTAT PANIER D'UN CAISSIER
  getCashierCart(cashierId) {
    return this.cashierCarts.get(cashierId) || { itemCount: 0, total: 0, lastUpdate: null };
  }
}

module.exports = new CashierSessionService();
