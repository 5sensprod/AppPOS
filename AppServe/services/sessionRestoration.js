// AppServe/services/sessionRestoration.js - VERSION CORRIGÉE
const DrawerSession = require('../models/DrawerSession');
const DrawerMovement = require('../models/DrawerMovement');
// ❌ RETIRÉ : Import direct qui crée un cycle
// const cashierSessionService = require('./cashierSessionService');
const apiEventEmitter = require('./apiEventEmitter');

class SessionRestorationService {
  constructor() {
    this.isInitialized = false;
  }

  // ✅ NOUVEAU : Import différé pour éviter les cycles
  getCashierSessionService() {
    return require('./cashierSessionService');
  }

  // Méthode principale de restauration
  async restoreActiveSessions() {
    if (this.isInitialized) {
      console.log('⚠️ [RESTORE] Restauration déjà effectuée');
      return;
    }

    console.log('🔄 [RESTORE] Démarrage restauration des sessions actives...');

    try {
      // 1. Trouver toutes les sessions ouvertes
      const openSessions = await DrawerSession.find({ status: 'open' });

      if (openSessions.length === 0) {
        console.log('✅ [RESTORE] Aucune session ouverte à restaurer');
        this.isInitialized = true;
        return;
      }

      console.log(`🔄 [RESTORE] ${openSessions.length} session(s) ouverte(s) trouvée(s)`);

      // 2. Restaurer chaque session
      for (const sessionDB of openSessions) {
        await this.restoreSession(sessionDB);
      }

      console.log('✅ [RESTORE] Toutes les sessions restaurées avec succès');
      this.isInitialized = true;
    } catch (error) {
      console.error('❌ [RESTORE] Erreur lors de la restauration:', error);
      this.isInitialized = true; // Éviter les boucles infinies
    }
  }

  // Restaurer une session spécifique
  async restoreSession(sessionDB) {
    try {
      const cashierId = sessionDB.cashier_id;
      const username = sessionDB.cashier_name;

      console.log(`🔄 [RESTORE] Restauration session ${username} (${cashierId})`);

      // 1. Récupérer tous les mouvements de cette session
      const movements = await DrawerMovement.findBySession(sessionDB._id);

      // 2. Calculer l'état actuel du fond
      const currentState = this.calculateCurrentDrawerState(sessionDB, movements);

      // 3. Créer la session en mémoire
      const restoredSession = {
        cashier_id: cashierId,
        username: username,
        startTime: new Date(sessionDB.opened_at),
        status: 'active',
        sales_count: 0, // TODO: Calculer depuis les ventes si nécessaire
        total_sales: 0, // TODO: Calculer depuis les ventes si nécessaire
        drawer_session_db_id: sessionDB._id,
        lcd: {
          requested: false,
          connected: false,
          port: null,
          error: null,
        },
        drawer: {
          opening_amount: sessionDB.opening_amount,
          current_amount: currentState.current_amount,
          expected_amount: currentState.expected_amount,
          denominations: sessionDB.denominations || {},
          method: sessionDB.method || 'custom',
          notes: sessionDB.notes,
          opened_at: new Date(sessionDB.opened_at),
          movements: currentState.recentMovements,
        },
        // Marquer comme restaurée
        restored: true,
        restored_at: new Date(),
      };

      // ✅ MODIFIÉ : Import différé
      const cashierSessionService = this.getCashierSessionService();

      // 4. Stocker en mémoire
      cashierSessionService.activeSessions.set(cashierId, restoredSession);
      cashierSessionService.cashierDrawers.set(cashierId, restoredSession.drawer);

      // 5. Initialiser le panier vide
      cashierSessionService.cashierCarts.set(cashierId, {
        itemCount: 0,
        total: 0.0,
        lastUpdate: new Date(),
      });

      // 6. Émettre événement de restauration
      apiEventEmitter.emit('cashier_session.status.changed', {
        cashier_id: cashierId,
        username: username,
        session: {
          status: 'active',
          startTime: restoredSession.startTime,
          sales_count: restoredSession.sales_count,
          total_sales: restoredSession.total_sales,
          lcd_connected: false,
          lcd_port: null,
          drawer_opened: true,
          drawer_amount: currentState.current_amount,
          restored: true,
        },
      });

      console.log(
        `✅ [RESTORE] Session ${username} restaurée - Fond: ${currentState.current_amount}€ (${movements.length} mouvements)`
      );
    } catch (error) {
      console.error(`❌ [RESTORE] Erreur restauration session ${sessionDB.cashier_name}:`, error);
    }
  }

  // Calculer l'état actuel du fond de caisse
  calculateCurrentDrawerState(sessionDB, movements) {
    let current_amount = sessionDB.opening_amount;
    let expected_amount = sessionDB.opening_amount;

    // Appliquer tous les mouvements
    movements.forEach((movement) => {
      if (movement.type === 'in') {
        current_amount += movement.amount;
      } else if (movement.type === 'out') {
        current_amount -= movement.amount;
      }
    });

    // TODO: Ajouter les ventes en espèces à expected_amount

    // Garder seulement les 50 mouvements les plus récents pour la mémoire
    const recentMovements = movements
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 50)
      .map((m) => ({
        id: `mov_${m._id}`,
        type: m.type,
        amount: m.amount,
        reason: m.reason,
        notes: m.notes,
        created_at: m.created_at,
        created_by: m.created_by,
      }));

    return {
      current_amount: Math.round(current_amount * 100) / 100,
      expected_amount: Math.round(expected_amount * 100) / 100,
      recentMovements,
    };
  }

  // Nettoyer les sessions orphelines (optionnel)
  async cleanupOrphanedSessions(maxHours = 24) {
    try {
      const cutoffTime = new Date(Date.now() - maxHours * 60 * 60 * 1000);

      const orphanedSessions = await DrawerSession.find({
        status: 'open',
        opened_at: { $lt: cutoffTime },
      });

      if (orphanedSessions.length === 0) {
        console.log('✅ [CLEANUP] Aucune session orpheline trouvée');
        return;
      }

      console.log(`🧹 [CLEANUP] ${orphanedSessions.length} session(s) orpheline(s) trouvée(s)`);

      for (const session of orphanedSessions) {
        console.log(
          `🧹 [CLEANUP] Fermeture automatique session ${session.cashier_name} (ouverte ${session.opened_at})`
        );

        await DrawerSession.closeSession(session._id, {
          closing_amount: session.opening_amount, // Fermeture par défaut sans écart
          expected_amount: session.opening_amount,
          variance: 0,
          notes: `Fermeture automatique - session orpheline (${maxHours}h)`,
        });
      }

      console.log('✅ [CLEANUP] Sessions orphelines nettoyées');
    } catch (error) {
      console.error('❌ [CLEANUP] Erreur nettoyage sessions orphelines:', error);
    }
  }

  // Méthode publique pour forcer la restauration
  async forceRestore() {
    this.isInitialized = false;
    await this.restoreActiveSessions();
  }

  // Statut de l'initialisation
  isReady() {
    return this.isInitialized;
  }
}

module.exports = new SessionRestorationService();
