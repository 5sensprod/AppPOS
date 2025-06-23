// services/cashierSessionService.js - VERSION OPTIMISÉE
const lcdDisplayService = require('./lcdDisplayService');
const apiEventEmitter = require('./apiEventEmitter');
const DrawerSession = require('../models/DrawerSession');
const DrawerMovement = require('../models/DrawerMovement');

class CashierSessionService {
  constructor() {
    this.activeSessions = new Map(); // cashier_id -> session data
    this.lcdOwnership = null; // { cashier_id, username, startTime, port }
    this.cashierCarts = new Map(); // cashier_id -> { itemCount, total, lastUpdate }
    this.cashierDrawers = new Map();
  }

  // ✅ HELPER: Valider les données d'ouverture
  _validateOpeningData(drawerData) {
    if (!drawerData?.opening_amount || drawerData.opening_amount <= 0) {
      throw new Error('Fond de caisse obligatoire pour ouvrir une session');
    }
  }

  // ✅ HELPER: Créer session en base
  async _createDBSession(cashierId, username, drawerData, lcdPort, lcdConfig) {
    const sessionData = {
      cashier_id: cashierId,
      cashier_name: username,
      opening_amount: drawerData.opening_amount,
      expected_amount: drawerData.opening_amount,
      denominations: drawerData.denominations || {},
      method: drawerData.method || 'custom',
      notes: drawerData.notes || null,
      status: 'open',
      ...(lcdPort && {
        lcd_port: lcdPort,
        lcd_config: lcdConfig || {},
      }),
    };

    try {
      const drawerSessionDB = await DrawerSession.create(sessionData);
      console.log(`💾 [DB] Session drawer persistée: ${drawerSessionDB._id}`);
      return drawerSessionDB;
    } catch (error) {
      console.error('❌ [DB] Erreur création session drawer:', error);
      throw new Error('Erreur de sauvegarde de la session');
    }
  }

  // ✅ HELPER: Créer structure session en mémoire
  _createSessionObject(cashierId, username, drawerData, drawerSessionDB) {
    return {
      cashier_id: cashierId,
      username,
      startTime: new Date(),
      status: 'active',
      sales_count: 0,
      total_sales: 0,
      drawer_session_db_id: drawerSessionDB._id,
      lcd: {
        requested: false,
        connected: false,
        port: null,
        error: null,
      },
      drawer: {
        opening_amount: drawerData.opening_amount,
        current_amount: drawerData.opening_amount,
        expected_amount: drawerData.opening_amount,
        denominations: drawerData.denominations || {},
        method: drawerData.method || 'custom',
        notes: drawerData.notes || null,
        opened_at: new Date(),
        movements: [],
      },
    };
  }

  // ✅ HELPER: Émettre événement session
  _emitSessionEvent(session, eventType = 'changed', extraData = {}) {
    const eventData = {
      cashier_id: session.cashier_id,
      username: session.username,
      session: {
        status: session.status,
        startTime: session.startTime,
        sales_count: session.sales_count,
        total_sales: session.total_sales,
        lcd_connected: session.lcd.connected,
        lcd_port: session.lcd.port,
        drawer_opened: session.status === 'active',
        drawer_amount: session.drawer.current_amount,
        ...extraData,
      },
    };

    console.info(
      `📡 [WS-EVENT] Émission cashier_session.status.${eventType} pour ${session.username}`
    );
    apiEventEmitter.emit(`cashier_session.status.${eventType}`, eventData);
  }

  // ✅ HELPER: Gérer LCD avec délai
  async _handleLCDWithDelay(action, delay = 3000) {
    return new Promise((resolve) => {
      setTimeout(async () => {
        try {
          await action();
          resolve();
        } catch (error) {
          console.warn('Erreur action LCD différée:', error.message);
          resolve();
        }
      }, delay);
    });
  }

  // ✅ OUVRIR SESSION - SIMPLIFIÉ
  async openCashierSession(cashier, lcdPort = null, lcdConfig = {}, drawerData = null) {
    const { id: cashierId, username } = cashier;
    console.info(`🏪 Ouverture session caisse pour ${username}`);

    // Vérifier session existante
    if (this.activeSessions.has(cashierId)) {
      const existingSession = this.activeSessions.get(cashierId);
      if (existingSession.restored) {
        this.markAsActive(cashierId);
        this._emitSessionEvent(existingSession, 'changed', { reactivated: true });
      }
      return {
        success: true,
        message: existingSession.restored ? 'Session restaurée réactivée' : 'Session déjà active',
        session: existingSession,
        resumed: true,
        restored: !!existingSession.restored,
      };
    }

    // Validation données
    this._validateOpeningData(drawerData);

    // Vérification session DB (non bloquante)
    let hasDBSessionWarning = false;
    try {
      const existingDBSession = await DrawerSession.findOpenSession(cashierId);
      if (existingDBSession) {
        hasDBSessionWarning = true;
        console.warn(`⚠️ [SESSION] Session DB ouverte trouvée pour ${username} - continuons`);
      }
    } catch (error) {
      console.warn('⚠️ [SESSION] Erreur vérification session DB (non bloquant):', error.message);
    }

    // Créer session DB et mémoire
    const drawerSessionDB = await this._createDBSession(
      cashierId,
      username,
      drawerData,
      lcdPort,
      lcdConfig
    );
    const session = this._createSessionObject(cashierId, username, drawerData, drawerSessionDB);

    // Initialiser états
    this.activeSessions.set(cashierId, session);
    this.cashierDrawers.set(cashierId, session.drawer);
    this.cashierCarts.set(cashierId, { itemCount: 0, total: 0.0, lastUpdate: new Date() });

    // Gérer LCD si demandé
    if (lcdPort) {
      try {
        await this.assignLCDToCashier(cashierId, username, lcdPort, lcdConfig);
        session.lcd.connected = true;
        session.lcd.port = lcdPort;
        session.lcd.requested = true;

        // Mise à jour base
        await DrawerSession.update(drawerSessionDB._id, { lcd_connected: true }).catch(
          console.warn
        );

        // Welcome différé
        this._handleLCDWithDelay(() => lcdDisplayService.showWelcomeMessage());
      } catch (error) {
        session.lcd.error = error.message;
        console.warn(`⚠️ LCD non disponible pour ${username}:`, error.message);
      }
    }

    // Émettre événement
    this._emitSessionEvent(session);

    return {
      success: true,
      message: 'Session caissier ouverte',
      session,
      lcd_status: session.lcd,
      db_warning: hasDBSessionWarning ? 'Session en base détectée - à surveiller' : null,
    };
  }

  // ✅ ASSIGNER LCD - SIMPLIFIÉ
  async assignLCDToCashier(cashierId, username, lcdPort, lcdConfig = {}) {
    const previousOwner = this.lcdOwnership ? { ...this.lcdOwnership } : null;

    // Vérifier disponibilité
    if (this.lcdOwnership?.cashier_id !== cashierId && this.lcdOwnership) {
      throw new Error(
        `LCD utilisé par ${this.lcdOwnership.username} depuis ${this.lcdOwnership.startTime.toLocaleTimeString()}`
      );
    }

    // Connecter
    const result = await lcdDisplayService.connectToDisplay(lcdPort, lcdConfig);

    // Enregistrer propriété
    this.lcdOwnership = {
      cashier_id: cashierId,
      username,
      startTime: new Date(),
      port: lcdPort,
      config: lcdConfig,
    };
    console.info(`📺 LCD assigné à ${username} sur ${lcdPort}`);

    // Message de connexion
    lcdDisplayService.writeToDisplay(`Bonjour ${username}`, 'LCD connecte').catch(console.warn);

    // Émettre événement
    console.info(`📡 [WS-EVENT] Émission lcd.ownership.changed - assigné à ${username}`);
    apiEventEmitter.emit('lcd.ownership.changed', {
      owned: true,
      owner: this.lcdOwnership,
      previous_owner: previousOwner
        ? {
            cashier_id: previousOwner.cashier_id,
            username: previousOwner.username,
          }
        : null,
    });

    return result;
  }

  // ✅ LIBÉRER LCD - SIMPLIFIÉ
  releaseLCDFromCashier(cashierId) {
    if (!this.lcdOwnership || this.lcdOwnership.cashier_id !== cashierId) return;

    const owner = this.lcdOwnership;

    // Séquence de libération
    const releaseSequence = async () => {
      try {
        await lcdDisplayService.writeToDisplay('Deconnexion LCD', 'Ecran disponible');
        await new Promise((resolve) => setTimeout(resolve, 3000));

        lcdDisplayService.disconnect();

        await new Promise((resolve) => setTimeout(resolve, 2000));
        await lcdDisplayService.connectToDisplay(owner.port, owner.config);
        await lcdDisplayService.showWelcomeMessage();

        await new Promise((resolve) => setTimeout(resolve, 5000));
        lcdDisplayService.disconnect();

        console.info(`📺 LCD libéré de ${owner.username}`);
      } catch (error) {
        console.warn('Erreur libération LCD:', error.message);
        lcdDisplayService.disconnect();
      }
    };

    // Lancer séquence en arrière-plan
    releaseSequence();

    // Émettre événement immédiat
    apiEventEmitter.emit('lcd.ownership.changed', {
      owned: false,
      owner: null,
      previous_owner: { cashier_id: owner.cashier_id, username: owner.username },
    });

    // Nettoyer états
    this.lcdOwnership = null;
    this.cashierCarts.delete(cashierId);

    const session = this.activeSessions.get(cashierId);
    if (session) {
      session.lcd.connected = false;
      session.lcd.port = null;
    }
  }

  // ✅ MOUVEMENT CAISSE - INCHANGÉ mais simplifié
  // Dans cashierSessionService.js - addCashMovement - CORRECTION

  async addCashMovement(cashierId, movementData) {
    console.log(`🔍 [DEBUG] Début addCashMovement pour ${cashierId}:`, movementData);

    try {
      const session = this.activeSessions.get(cashierId);
      const drawer = this.cashierDrawers.get(cashierId);

      console.log(`🔍 [DEBUG] Session trouvée:`, !!session);
      console.log(`🔍 [DEBUG] Drawer trouvé:`, !!drawer);

      if (!session || !drawer) {
        throw new Error('Aucune session active avec fond de caisse');
      }

      console.log(`🔍 [DEBUG] Création du movement...`);
      const movement = {
        id: `mov_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        type: movementData.type,
        amount: parseFloat(movementData.amount),
        reason: movementData.reason,
        notes: movementData.notes || null,
        created_at: new Date(),
        created_by: session.username,
      };

      console.log(`🔍 [DEBUG] Movement créé:`, movement);

      // Calculer nouveau solde
      const newAmount =
        movementData.type === 'in'
          ? drawer.current_amount + movement.amount
          : drawer.current_amount - movement.amount;

      console.log(`🔍 [DEBUG] Calcul solde: ${drawer.current_amount} -> ${newAmount}`);

      if (newAmount < 0) {
        throw new Error('Solde de caisse insuffisant');
      }

      // ✅ PERSISTANCE EN BASE
      console.log(`🔍 [DEBUG] Début persistance DB...`);
      try {
        if (session.drawer_session_db_id) {
          console.log(`🔍 [DEBUG] Appel DrawerMovement.create avec:`, {
            drawer_session_id: session.drawer_session_db_id,
            cashier_id: cashierId,
            type: movement.type,
            amount: movement.amount,
            reason: movement.reason,
            notes: movement.notes,
            created_by: movement.created_by,
          });

          await DrawerMovement.create({
            drawer_session_id: session.drawer_session_db_id,
            cashier_id: cashierId,
            type: movement.type,
            amount: movement.amount,
            reason: movement.reason,
            notes: movement.notes,
            created_by: movement.created_by,
          });
          console.log(`✅ [DEBUG] DrawerMovement.create réussi`);
        } else {
          console.warn(`⚠️ [DEBUG] Pas de drawer_session_db_id`);
        }
      } catch (error) {
        console.error('❌ [DEBUG] Erreur sauvegarde mouvement:', error);
        // Ne pas faire échouer l'opération si erreur DB
      }

      console.log(`🔍 [DEBUG] Mise à jour mémoire...`);
      // ✅ METTRE À JOUR FOND DE CAISSE EN MÉMOIRE
      drawer.current_amount = newAmount;
      drawer.movements.unshift(movement);
      if (drawer.movements.length > 50) drawer.movements = drawer.movements.slice(0, 50);

      session.drawer = drawer;

      console.log(`🔍 [DEBUG] Calcul expectedAmount...`);
      // ✅ CALCULER EXPECTED AMOUNT
      let expectedAmount = drawer.opening_amount;
      drawer.movements.forEach((mov) => {
        if (mov.type === 'in') expectedAmount += mov.amount;
        else expectedAmount -= mov.amount;
      });

      console.log(`🔍 [DEBUG] ExpectedAmount calculé: ${expectedAmount}`);

      console.log(`🔍 [DEBUG] Émission événement WebSocket...`);
      // ✅ ÉMETTRE ÉVÉNEMENT WEBSOCKET
      try {
        apiEventEmitter.emit('cashier_drawer.movement.added', {
          cashier_id: cashierId,
          movement,
          new_balance: newAmount,
          drawer_state: {
            currentAmount: newAmount,
            expectedAmount: expectedAmount,
            openingAmount: drawer.opening_amount,
            variance: newAmount - expectedAmount,
          },
        });
        console.log(`✅ [DEBUG] Événement WebSocket émis avec succès`);
      } catch (wsError) {
        console.error('❌ [DEBUG] Erreur émission WebSocket:', wsError);
        // Ne pas faire échouer pour une erreur WebSocket
      }

      console.log(`✅ [DEBUG] addCashMovement terminé avec succès`);
      return { movement, new_balance: newAmount };
    } catch (error) {
      console.error(`❌ [DEBUG] Erreur dans addCashMovement:`, error);
      throw error;
    }
  }

  // ✅ FERMER SESSION - SIMPLIFIÉ
  async closeCashierSession(cashierId, closingData = null) {
    const session = this.activeSessions.get(cashierId);
    if (!session) throw new Error('Aucune session active trouvée');

    console.info(`🏪 Fermeture session caisse pour ${session.username}`);

    // Préparer données de fermeture
    if (closingData && session.drawer) {
      session.drawer.closing = {
        counted_amount: closingData.counted_amount || session.drawer.current_amount,
        expected_amount: closingData.expected_amount || session.drawer.expected_amount,
        variance:
          (closingData.counted_amount || session.drawer.current_amount) -
          (closingData.expected_amount || session.drawer.expected_amount),
        closing_method: closingData.method || 'custom',
        notes: closingData.notes || null,
        closed_at: new Date(),
        variance_accepted: closingData.variance_accepted || false,
      };
    }

    // Fermer en base
    const updateData = {
      status: 'closed',
      closed_at: new Date(),
      updated_at: new Date(),
      ...(closingData && {
        closing_amount: closingData.counted_amount,
        expected_amount: closingData.expected_amount || session.drawer?.expected_amount,
        variance: closingData.variance || 0,
        method: closingData.method || 'custom',
        notes: closingData.notes || null,
      }),
    };

    if (session.drawer_session_db_id) {
      await DrawerSession.update(session.drawer_session_db_id, updateData);
    } else {
      // Fallback: fermer toutes les sessions ouvertes
      const openSessions = await DrawerSession.find({ cashier_id: cashierId, status: 'open' });
      for (const openSession of openSessions) {
        await DrawerSession.update(openSession._id, {
          ...updateData,
          notes: 'Fermée automatiquement',
        });
      }
    }

    // Libérer LCD et nettoyer
    this.releaseLCDFromCashier(cashierId);

    session.status = 'closed';
    session.endTime = new Date();
    session.duration = session.endTime - session.startTime;

    // Émettre événement
    this._emitSessionEvent(session, 'changed', {
      endTime: session.endTime,
      duration: session.duration,
      drawer_closed: true,
      drawer_variance: session.drawer?.closing?.variance || 0,
    });

    // Nettoyer états
    this.activeSessions.delete(cashierId);
    this.cashierCarts.delete(cashierId);

    return { success: true, message: 'Session fermée', session };
  }

  // ✅ MISE À JOUR PANIER - SIMPLIFIÉ
  async updateCashierCart(cashierId, itemCount, total, options = {}) {
    if (
      !this.activeSessions.has(cashierId) ||
      !this.lcdOwnership ||
      this.lcdOwnership.cashier_id !== cashierId
    ) {
      return;
    }

    const currentCart = this.cashierCarts.get(cashierId) || { itemCount: 0, total: 0 };

    // Vérifier changement
    if (currentCart.itemCount === itemCount && Math.abs(currentCart.total - total) < 0.01) {
      return;
    }

    // Mettre à jour
    this.cashierCarts.set(cashierId, { itemCount, total, lastUpdate: new Date() });

    // ✅ NOUVEAU : Affichage LCD CONDITIONNEL
    try {
      // ❌ SUPPRIMER L'AFFICHAGE AUTOMATIQUE
      // if (itemCount === 0 && !options.skipWelcome) {
      //   await lcdDisplayService.showWelcomeMessage();
      // } else if (itemCount > 0) {
      //   await lcdDisplayService.writeToDisplay(`Qte: ${itemCount}`, `${total.toFixed(2)}EUR`);
      // }

      // ✅ NOUVEAU : Seulement Welcome si panier vide
      if (itemCount === 0 && !options.skipWelcome) {
        await lcdDisplayService.showWelcomeMessage();
      }
      // ✅ Pour les autres cas, laisser le frontend gérer l'affichage
    } catch (error) {
      console.warn('⚠️ [API] Erreur mise à jour LCD:', error.message);
    }
  }

  // ✅ MÉTHODES UTILITAIRES - INCHANGÉES
  calculateExpectedCashAmount(cashierId) {
    const session = this.activeSessions.get(cashierId);
    if (!session?.drawer) return 0;

    let expected = session.drawer.opening_amount;
    session.drawer.movements.forEach((movement) => {
      expected += movement.type === 'in' ? movement.amount : -movement.amount;
    });

    return Math.round(expected * 100) / 100;
  }

  getCashierDrawer(cashierId) {
    const session = this.activeSessions.get(cashierId);
    return session?.drawer
      ? {
          ...session.drawer,
          expected_amount: this.calculateExpectedCashAmount(cashierId),
        }
      : null;
  }

  getCashierSession(cashierId) {
    const session = this.activeSessions.get(cashierId);
    return session ? { ...session, drawer: this.getCashierDrawer(cashierId) } : null;
  }

  getLCDStatus() {
    return {
      owned: !!this.lcdOwnership,
      owner: this.lcdOwnership,
      display_status: lcdDisplayService.getStatus(),
    };
  }

  getActiveSessions() {
    return Array.from(this.activeSessions.values());
  }

  getCashierCart(cashierId) {
    return this.cashierCarts.get(cashierId) || { itemCount: 0, total: 0, lastUpdate: null };
  }

  // ✅ MÉTHODES PROXY LCD - SIMPLIFIÉES
  async useLCD(cashierId, operation) {
    if (!this.lcdOwnership || this.lcdOwnership.cashier_id !== cashierId) {
      throw new Error('LCD non assigné à ce caissier');
    }
    if (!this.activeSessions.has(cashierId)) {
      throw new Error('Aucune session caissier active');
    }

    try {
      return await operation();
    } catch (error) {
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

  // Méthodes proxy LCD
  async writeMessage(cashierId, line1, line2) {
    return this.useLCD(cashierId, () => lcdDisplayService.writeToDisplay(line1, line2));
  }
  async showPrice(cashierId, itemName, price) {
    return this.useLCD(cashierId, () => lcdDisplayService.showPrice(itemName, price));
  }
  async showTotal(cashierId, total) {
    return this.useLCD(cashierId, () => lcdDisplayService.showTotal(total));
  }
  async showWelcome(cashierId) {
    return this.useLCD(cashierId, () => lcdDisplayService.showWelcomeMessage());
  }
  async showThankYou(cashierId) {
    return this.useLCD(cashierId, () => lcdDisplayService.showThankYou());
  }
  async clearDisplay(cashierId) {
    return this.useLCD(cashierId, () => lcdDisplayService.clearDisplay());
  }

  // ✅ TRAITEMENT VENTE - SIMPLIFIÉ
  async processSaleComplete(cashierId) {
    console.log('🔄 [BACKEND] processSaleComplete appelé - délégué au frontend');

    if (!this.lcdOwnership || this.lcdOwnership.cashier_id !== cashierId) return;

    try {
      // ❌ SUPPRIMER : await lcdDisplayService.showThankYou();
      // ❌ SUPPRIMER : this._handleLCDWithDelay(() => lcdDisplayService.showWelcomeMessage());

      // ✅ GARDER seulement : Reset panier backend
      this.updateCashierCart(cashierId, 0, 0.0, { skipWelcome: true });
    } catch (error) {
      console.warn('Erreur séquence vente:', error.message);
    }
  }
  updateSaleStats(cashierId, saleAmount) {
    const session = this.activeSessions.get(cashierId);
    if (!session) return;

    session.sales_count++;
    session.total_sales += saleAmount;
    session.last_sale = new Date();

    // Émettre événement stats
    apiEventEmitter.emit('cashier_session.stats.updated', {
      cashier_id: cashierId,
      username: session.username,
      stats: {
        sales_count: session.sales_count,
        total_sales: Math.round(session.total_sales * 100) / 100,
        last_sale_at: session.last_sale,
      },
    });

    this.processSaleComplete(cashierId);

    return {
      sales_count: session.sales_count,
      total_sales: session.total_sales,
      last_sale: session.last_sale,
    };
  }

  async notifyCartChange(cashierId, itemCount, total) {
    await this.updateCashierCart(cashierId, itemCount, total);
  }

  isRestoredSession(cashierId) {
    return this.activeSessions.get(cashierId)?.restored === true;
  }

  getRestorationInfo(cashierId) {
    const session = this.activeSessions.get(cashierId);
    return session?.restored
      ? {
          restored: true,
          restored_at: session.restored_at,
          session_duration: session.restored_at - session.startTime,
        }
      : null;
  }

  markAsActive(cashierId) {
    const session = this.activeSessions.get(cashierId);
    if (session?.restored) {
      delete session.restored;
      delete session.restored_at;
      console.log(`🔄 [SESSION] Session ${session.username} marquée comme active`);
    }
  }
}

module.exports = new CashierSessionService();
