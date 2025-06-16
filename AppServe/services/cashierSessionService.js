// services/cashierSessionService.js - AVEC ÉVÉNEMENTS WEBSOCKET
const lcdDisplayService = require('./lcdDisplayService');
// ✅ NOUVEAU : Import pour émettre des événements
const apiEventEmitter = require('./apiEventEmitter');
const DrawerSession = require('../models/DrawerSession');
const DrawerMovement = require('../models/DrawerMovement');

class CashierSessionService {
  constructor() {
    this.activeSessions = new Map(); // cashier_id -> session data
    this.lcdOwnership = null; // { cashier_id, username, startTime, port }
    this.cashierCarts = new Map(); // cashier_id -> { itemCount, total, lastUpdate }
    this.cashierDrawers = new Map(); // cashier_id -> drawer data
  }

  // ✅ OUVRIR UNE SESSION DE CAISSE
  async openCashierSession(cashier, lcdPort = null, lcdConfig = {}, drawerData = null) {
    const cashierId = cashier.id;
    const username = cashier.username;

    console.info(`🏪 Ouverture session caisse pour ${username}`);

    // Vérifier si une session existe déjà pour ce caissier (EXISTANT)
    if (this.activeSessions.has(cashierId)) {
      const existingSession = this.activeSessions.get(cashierId);

      // Si session restaurée, la marquer comme active et retourner
      if (existingSession.restored) {
        this.markAsActive(cashierId);
        console.info(`🔄 [SESSION] Session restaurée réactivée pour ${username}`);

        // Émettre événement de réactivation
        apiEventEmitter.emit('cashier_session.status.changed', {
          cashier_id: cashierId,
          username: username,
          session: {
            status: 'active',
            startTime: existingSession.startTime,
            sales_count: existingSession.sales_count,
            total_sales: existingSession.total_sales,
            lcd_connected: existingSession.lcd.connected,
            lcd_port: existingSession.lcd.port,
            drawer_opened: true,
            drawer_amount: existingSession.drawer.current_amount,
            reactivated: true,
          },
        });
      }

      return {
        success: true,
        message: existingSession.restored ? 'Session restaurée réactivée' : 'Session déjà active',
        session: existingSession,
        resumed: true,
        restored: !!existingSession.restored,
      };
    }
    let hasDBSessionWarning = false;
    try {
      const existingDBSession = await DrawerSession.findOpenSession(cashierId);
      if (existingDBSession) {
        hasDBSessionWarning = true;
        console.warn(
          `⚠️ [SESSION] Session DB ouverte trouvée pour ${username} (ID: ${existingDBSession._id}), mais on continue l'ouverture`
        );
        // ✅ NE PAS FAIRE DE RETURN ICI - on continue !
      }
    } catch (error) {
      console.warn('⚠️ [SESSION] Erreur vérification session DB (non bloquant):', error.message);
      // ✅ NE PAS FAIRE DE RETURN ICI NON PLUS - on continue !
    }

    // ✅ NOUVEAU : Validation fond de caisse obligatoire
    if (!drawerData || !drawerData.opening_amount || drawerData.opening_amount <= 0) {
      throw new Error('Fond de caisse obligatoire pour ouvrir une session');
    }

    // ✅ NOUVEAU : Persister la session drawer en base AVANT de créer la session en mémoire
    let drawerSessionDB = null;
    try {
      drawerSessionDB = await DrawerSession.create({
        cashier_id: cashierId,
        cashier_name: username,
        opening_amount: drawerData.opening_amount,
        expected_amount: drawerData.opening_amount,
        denominations: drawerData.denominations || {},
        method: drawerData.method || 'custom',
        notes: drawerData.notes || null,
        status: 'open',
      });
      console.log(`💾 [DB] Session drawer persistée: ${drawerSessionDB._id}`);
    } catch (error) {
      console.error('❌ [DB] Erreur création session drawer:', error);
      throw new Error('Erreur de sauvegarde de la session');
    }

    // Créer la session (MODIFIER votre structure existante)
    const session = {
      cashier_id: cashierId,
      username,
      startTime: new Date(),
      status: 'active',
      sales_count: 0,
      total_sales: 0,
      // ✅ AJOUTER référence DB
      drawer_session_db_id: drawerSessionDB._id,
      lcd: {
        requested: !!lcdPort,
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

    // ✅ NOUVEAU : Stocker fond de caisse séparément
    this.cashierDrawers.set(cashierId, session.drawer);

    // ✅ NOUVEAU : Initialiser l'état panier pour ce caissier (DÉPLACER DE L'EXISTANT)
    this.cashierCarts.set(cashierId, {
      itemCount: 0,
      total: 0.0,
      lastUpdate: new Date(),
    });

    // Tentative de prise de contrôle LCD si demandé (EXISTANT - GARDER TEL QUEL)
    if (lcdPort) {
      try {
        await this.assignLCDToCashier(cashierId, username, lcdPort, lcdConfig);
        session.lcd.connected = true;
        session.lcd.port = lcdPort;

        // ✅ WELCOME APRÈS UNE PAUSE (pour laisser lire "Bonjour [nom]")
        setTimeout(async () => {
          try {
            console.info(`👋 [API] Affichage welcome après connexion pour ${username}`);
            await lcdDisplayService.showWelcomeMessage();
          } catch (error) {
            console.warn('Erreur welcome:', error.message);
          }
        }, 3000); // 3s pour lire le message de connexion
      } catch (error) {
        session.lcd.error = error.message;
        console.warn(`⚠️ LCD non disponible pour ${username}:`, error.message);
      }
    }

    this.activeSessions.set(cashierId, session);
    this.cashierDrawers.set(cashierId, session.drawer);

    // ✅ MODIFIER : ÉMETTRE ÉVÉNEMENT SESSION OUVERTE avec données drawer
    console.info(`📡 [WS-EVENT] Émission cashier_session.status.changed pour ${username}`);
    apiEventEmitter.emit('cashier_session.status.changed', {
      cashier_id: cashierId,
      username: username,
      session: {
        status: session.status,
        startTime: session.startTime,
        sales_count: session.sales_count,
        total_sales: session.total_sales,
        lcd_connected: session.lcd.connected,
        lcd_port: session.lcd.port,
        // ✅ NOUVEAU : Données fond de caisse
        drawer_opened: true,
        drawer_amount: session.drawer.opening_amount,
      },
    });

    return {
      success: true,
      message: 'Session caissier ouverte',
      session,
      lcd_status: session.lcd,
      // ✅ AJOUTER l'info sur la session DB en doublon (sans bloquer)
      db_warning: hasDBSessionWarning ? 'Session en base détectée - à surveiller' : null,
    };
  }

  // ✅ ASSIGNER LE LCD À UN CAISSIER
  async assignLCDToCashier(cashierId, username, lcdPort, lcdConfig = {}) {
    // Capturer l'ancien propriétaire pour l'événement
    const previousOwner = this.lcdOwnership ? { ...this.lcdOwnership } : null;

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

      // ✅ SÉQUENCE PERSONNALISÉE DE CONNEXION (SANS WELCOME)
      try {
        // Message de connexion personnalisé avec pause pour lecture
        console.info(`👋 Affichage message connexion pour ${username}`);
        await lcdDisplayService.writeToDisplay(`Bonjour ${username}`, 'LCD connecte');

        // ✅ PAS DE WELCOME ICI - laissé à openCashierSession
      } catch (error) {
        console.warn('Erreur affichage message connexion:', error.message);
      }

      // ✅ ÉMETTRE ÉVÉNEMENT LCD ASSIGNÉ
      console.info(`📡 [WS-EVENT] Émission lcd.ownership.changed - assigné à ${username}`);
      apiEventEmitter.emit('lcd.ownership.changed', {
        owned: true,
        owner: {
          cashier_id: this.lcdOwnership.cashier_id,
          username: this.lcdOwnership.username,
          port: this.lcdOwnership.port,
          startTime: this.lcdOwnership.startTime,
        },
        previous_owner: previousOwner
          ? {
              cashier_id: previousOwner.cashier_id,
              username: previousOwner.username,
            }
          : null,
      });

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
        // ✅ 1. AFFICHER MESSAGE DE DÉCONNEXION
        console.info(`📺 Affichage message déconnexion LCD pour ${owner.username}`);
        lcdDisplayService.writeToDisplay('Deconnexion LCD', 'Ecran disponible');

        // ✅ 2. SÉQUENCE TEMPORISÉE
        setTimeout(() => {
          try {
            // 2a. Déconnexion physique
            lcdDisplayService.disconnect();
            console.info(`📺 LCD libéré de ${owner.username}`);

            // ✅ 2b. RECONNEXION + WELCOME (après 2s supplémentaires)
            setTimeout(async () => {
              try {
                // Reconnexion pour afficher le welcome
                await lcdDisplayService.connectToDisplay(owner.port, owner.config);
                await lcdDisplayService.showWelcomeMessage();
                console.info(`👋 Message welcome affiché après libération LCD`);

                // Puis déconnexion finale
                setTimeout(() => {
                  lcdDisplayService.disconnect();
                  console.info(`📺 LCD déconnecté définitivement`);
                }, 5000); // Welcome visible 5 secondes
              } catch (error) {
                console.warn('Erreur affichage welcome après libération:', error.message);
              }
            }, 2000);
          } catch (error) {
            console.warn('Erreur lors de la libération LCD:', error.message);
          }
        }, 3000); // 3 secondes pour lire "Déconnexion LCD"
      } catch (error) {
        console.warn('Erreur affichage message déconnexion:', error.message);
        // Fallback : déconnexion directe
        try {
          lcdDisplayService.disconnect();
        } catch (disconnectError) {
          console.warn('Erreur lors de la libération LCD:', disconnectError.message);
        }
      }

      // ✅ ÉMETTRE ÉVÉNEMENT LCD LIBÉRÉ (immédiat pour l'UI)
      console.info(`📡 [WS-EVENT] Émission lcd.ownership.changed - libéré de ${owner.username}`);
      apiEventEmitter.emit('lcd.ownership.changed', {
        owned: false,
        owner: null,
        previous_owner: {
          cashier_id: owner.cashier_id,
          username: owner.username,
        },
      });

      this.lcdOwnership = null;

      // Mettre à jour la session
      if (this.activeSessions.has(cashierId)) {
        const session = this.activeSessions.get(cashierId);
        session.lcd.connected = false;
        session.lcd.port = null;
      }

      this.cashierCarts.delete(cashierId);
    }
  }

  async addCashMovement(cashierId, movementData) {
    const session = this.activeSessions.get(cashierId);
    const drawer = this.cashierDrawers.get(cashierId);

    if (!session || !drawer) {
      throw new Error('Aucune session active avec fond de caisse');
    }

    const movement = {
      id: `mov_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      type: movementData.type, // 'in' ou 'out'
      amount: parseFloat(movementData.amount),
      reason: movementData.reason,
      notes: movementData.notes || null,
      created_at: new Date(),
      created_by: session.username,
    };

    // Calculer nouveau solde
    const newAmount =
      movementData.type === 'in'
        ? drawer.current_amount + movement.amount
        : drawer.current_amount - movement.amount;

    if (newAmount < 0) {
      throw new Error('Solde de caisse insuffisant');
    }

    // Mettre à jour fond de caisse
    drawer.current_amount = newAmount;
    drawer.movements.unshift(movement); // Plus récent en premier
    if (drawer.movements.length > 50) drawer.movements = drawer.movements.slice(0, 50);

    // Mettre à jour session
    session.drawer = drawer;

    // ✅ Émettre événement mouvement
    apiEventEmitter.emit('cashier_drawer.movement.added', {
      cashier_id: cashierId,
      movement,
      new_balance: newAmount,
    });

    return { movement, new_balance: newAmount };
  }

  // ✅ NOUVEAU : Calculer totaux théoriques
  calculateExpectedCashAmount(cashierId) {
    const session = this.activeSessions.get(cashierId);
    const drawer = this.cashierDrawers.get(cashierId);

    if (!session || !drawer) return 0;

    // Calcul : Ouverture + Ventes cash + Mouvements
    let expected = drawer.opening_amount;

    // TODO: Ajouter ventes en espèces depuis les sales
    // expected += session.cash_sales_amount || 0;

    // Ajouter mouvements
    drawer.movements.forEach((movement) => {
      if (movement.type === 'in') expected += movement.amount;
      else expected -= movement.amount;
    });

    return Math.round(expected * 100) / 100;
  }

  // ✅ NOUVEAU : Obtenir données fond de caisse
  getCashierDrawer(cashierId) {
    const drawer = this.cashierDrawers.get(cashierId);
    if (!drawer) return null;

    return {
      ...drawer,
      expected_amount: this.calculateExpectedCashAmount(cashierId),
    };
  }

  // ✅ FERMER SESSION CAISSIER
  async closeCashierSession(cashierId, closingData = null) {
    const session = this.activeSessions.get(cashierId);
    const drawer = this.cashierDrawers.get(cashierId);

    if (!session) {
      throw new Error('Aucune session active trouvée');
    }

    console.info(`🏪 Fermeture session caisse pour ${session.username}`);

    // ✅ NOUVEAU : Validation fermeture fond
    if (closingData && drawer) {
      drawer.closing = {
        counted_amount: closingData.counted_amount || drawer.current_amount,
        expected_amount: closingData.expected_amount || drawer.expected_amount,
        variance:
          (closingData.counted_amount || drawer.current_amount) -
          (closingData.expected_amount || drawer.expected_amount),
        closing_method: closingData.method || 'custom',
        notes: closingData.notes || null,
        closed_at: new Date(),
        variance_accepted: closingData.variance_accepted || false,
      };
    }

    // Libérer le LCD si possédé (EXISTANT - GARDER)
    this.releaseLCDFromCashier(cashierId);

    // Marquer la session comme fermée (EXISTANT - MODIFIER)
    session.status = 'closed';
    session.endTime = new Date();
    session.duration = session.endTime - session.startTime;

    // ✅ MODIFIER : ÉMETTRE ÉVÉNEMENT SESSION FERMÉE avec données drawer
    console.info(
      `📡 [WS-EVENT] Émission cashier_session.status.changed - session fermée pour ${session.username}`
    );
    apiEventEmitter.emit('cashier_session.status.changed', {
      cashier_id: cashierId,
      username: session.username,
      session: {
        status: 'closed',
        startTime: session.startTime,
        endTime: session.endTime,
        duration: session.duration,
        sales_count: session.sales_count,
        total_sales: session.total_sales,
        // ✅ NOUVEAU : Données fermeture fond
        drawer_closed: true,
        drawer_variance: drawer?.closing?.variance || 0,
      },
    });

    // Retirer de la liste active (EXISTANT)
    this.activeSessions.delete(cashierId);

    // ✅ NOUVEAU : Nettoyer le fond de caisse
    this.cashierDrawers.delete(cashierId);

    // ✅ NOUVEAU : Nettoyer l'état panier (DÉPLACER DE L'EXISTANT)
    this.cashierCarts.delete(cashierId);

    return {
      success: true,
      message: 'Session fermée',
      session,
    };
  }

  // ✅ CORRIGÉ : MISE À JOUR INTELLIGENTE DU PANIER avec options
  async updateCashierCart(cashierId, itemCount, total, options = {}) {
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
      if (itemCount === 0 && !options.skipWelcome) {
        console.info(`👋 [API] Panier vide -> Welcome pour ${this.lcdOwnership.username}`);
        await lcdDisplayService.showWelcomeMessage();
      } else if (itemCount > 0) {
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

  // ✅ CORRIGÉ : TRAITEMENT VENTE COMPLÈTE
  async processSaleComplete(cashierId) {
    if (!this.lcdOwnership || this.lcdOwnership.cashier_id !== cashierId) return;

    try {
      // 1. Merci
      await lcdDisplayService.showThankYou();
      console.info(`🙏 [API] Message remerciement affiché`);

      // 2. Pause puis bienvenue
      setTimeout(async () => {
        try {
          // ✅ WELCOME DIRECT (sans passer par updateCashierCart)
          await lcdDisplayService.showWelcomeMessage();
          console.info(`👋 [API] Retour message bienvenue après vente`);

          // ✅ PUIS reset panier SANS welcome
          this.updateCashierCart(cashierId, 0, 0.0, { skipWelcome: true });
        } catch (error) {
          console.warn('Erreur welcome après vente:', error.message);
        }
      }, 3000);

      // 3. Panier vide (immédiat avec option skipWelcome)
      this.updateCashierCart(cashierId, 0, 0.0, { skipWelcome: true });
    } catch (error) {
      console.warn('Erreur séquence vente:', error.message);
    }
  }

  // ✅ OBTENIR INFO SESSION
  getCashierSession(cashierId) {
    const session = this.activeSessions.get(cashierId);
    if (!session) return null;

    // ✅ NOUVEAU : Enrichir avec données fond de caisse
    return {
      ...session,
      drawer: this.getCashierDrawer(cashierId),
    };
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

  // ✅ NOUVEAU : STATS POUR UN CAISSIER AVEC MISE À JOUR AUTO LCD + ÉVÉNEMENT WS
  updateSaleStats(cashierId, saleAmount) {
    const session = this.activeSessions.get(cashierId);
    if (session) {
      // Mettre à jour les stats
      session.sales_count++;
      session.total_sales += saleAmount;
      session.last_sale = new Date();

      // ✅ NOUVEAU : ÉMETTRE ÉVÉNEMENT STATS MISES À JOUR
      console.info(`📡 [WS-EVENT] Émission cashier_session.stats.updated pour ${session.username}`);
      apiEventEmitter.emit('cashier_session.stats.updated', {
        cashier_id: cashierId,
        username: session.username,
        stats: {
          sales_count: session.sales_count,
          total_sales: Math.round(session.total_sales * 100) / 100,
          last_sale_at: session.last_sale,
        },
      });

      // ✅ APPELER LA SÉQUENCE COMPLÈTE LCD
      console.info(`💳 [API] Vente terminée -> Séquence remerciement pour ${session.username}`);
      this.processSaleComplete(cashierId);

      // ✅ RETOURNER LES STATS MISES À JOUR
      return {
        sales_count: session.sales_count,
        total_sales: session.total_sales,
        last_sale: session.last_sale,
      };
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

  isRestoredSession(cashierId) {
    const session = this.activeSessions.get(cashierId);
    return session && session.restored === true;
  }

  getRestorationInfo(cashierId) {
    const session = this.activeSessions.get(cashierId);
    if (!session || !session.restored) {
      return null;
    }

    return {
      restored: true,
      restored_at: session.restored_at,
      session_duration: session.restored_at - session.startTime,
    };
  }

  markAsActive(cashierId) {
    const session = this.activeSessions.get(cashierId);
    if (session && session.restored) {
      delete session.restored;
      delete session.restored_at;
      console.log(`🔄 [SESSION] Session ${session.username} marquée comme active`);
    }
  }
}

module.exports = new CashierSessionService();
