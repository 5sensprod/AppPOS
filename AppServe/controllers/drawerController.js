// AppServe/controllers/drawerController.js
const DrawerSession = require('../models/DrawerSession');
const DrawerMovement = require('../models/DrawerMovement');
const ResponseHandler = require('../handlers/ResponseHandler');
const cashierSessionService = require('../services/cashierSessionService');

class DrawerController {
  // Ajouter un mouvement de caisse
  async addMovement(req, res) {
    try {
      const cashierId = req.user.id;
      const { type, amount, reason, notes } = req.body;

      // Utiliser le service existant qui gère déjà WebSocket
      const result = await cashierSessionService.addCashMovement(cashierId, {
        type,
        amount,
        reason,
        notes,
      });

      // Persister en base de données
      const activeSession = await DrawerSession.findOpenSession(cashierId);
      if (activeSession) {
        await DrawerMovement.create({
          drawer_session_id: activeSession._id,
          cashier_id: cashierId,
          type,
          amount: parseFloat(amount),
          reason,
          notes,
          created_by: req.user.username,
        });
      }

      return ResponseHandler.success(res, result);
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  // Obtenir le statut du fond de caisse
  async getStatus(req, res) {
    try {
      const cashierId = req.user.id;

      // Données du service (en mémoire)
      const drawer = cashierSessionService.getCashierDrawer(cashierId);

      if (!drawer) {
        return ResponseHandler.success(res, {
          drawer: null,
          has_open_drawer: false,
        });
      }

      return ResponseHandler.success(res, {
        drawer: {
          ...drawer,
          variance: drawer.current_amount - drawer.expected_amount,
          is_balanced: Math.abs(drawer.current_amount - drawer.expected_amount) < 0.01,
        },
        has_open_drawer: true,
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  // Obtenir les mouvements de caisse
  async getMovements(req, res) {
    try {
      const cashierId = req.user.id;
      const { session_id, today_only = false } = req.query;

      let movements;

      if (session_id) {
        movements = await DrawerMovement.findBySession(session_id);
      } else if (today_only === 'true') {
        movements = await DrawerMovement.getTodaysMovements(cashierId);
      } else {
        movements = await DrawerMovement.findByCashier(cashierId);
      }

      // Trier par date décroissante
      movements.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      return ResponseHandler.success(res, {
        movements,
        count: movements.length,
        total_in: movements.filter((m) => m.type === 'in').reduce((sum, m) => sum + m.amount, 0),
        total_out: movements.filter((m) => m.type === 'out').reduce((sum, m) => sum + m.amount, 0),
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  // Fermer le fond de caisse avec réconciliation
  async closeDrawer(req, res) {
    try {
      const cashierId = req.user.id;
      const { counted_amount, expected_amount, method, notes, variance_accepted } = req.body;

      // Validation
      if (counted_amount === undefined || counted_amount < 0) {
        return ResponseHandler.badRequest(res, 'Montant compté invalide');
      }

      const closingData = {
        counted_amount: parseFloat(counted_amount),
        expected_amount: parseFloat(expected_amount),
        method: method || 'custom',
        notes: notes ? notes.trim() : null,
        variance_accepted: variance_accepted || false,
      };

      // Fermer via le service (gère WebSocket)
      const result = await cashierSessionService.closeCashierSession(cashierId, closingData);

      // Persister la fermeture en base
      const activeSession = await DrawerSession.findOpenSession(cashierId);
      if (activeSession) {
        const variance = closingData.counted_amount - closingData.expected_amount;

        await DrawerSession.closeSession(activeSession._id, {
          closing_amount: closingData.counted_amount,
          expected_amount: closingData.expected_amount,
          variance,
          notes: closingData.notes,
        });
      }

      return ResponseHandler.success(res, result);
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  // Historique des sessions de caisse
  async getHistory(req, res) {
    try {
      const cashierId = req.user.id;
      const { start_date, end_date, limit = 50 } = req.query;

      let sessions;

      if (start_date && end_date) {
        sessions = await DrawerSession.findByDateRange(start_date, end_date);
      } else {
        sessions = await DrawerSession.findByCashier(cashierId);
      }

      // Filtrer par caissier et limiter
      sessions = sessions
        .filter((s) => s.cashier_id === cashierId)
        .sort((a, b) => new Date(b.opened_at) - new Date(a.opened_at))
        .slice(0, parseInt(limit));

      // Enrichir avec les mouvements
      const enrichedSessions = await Promise.all(
        sessions.map(async (session) => {
          const movements = await DrawerMovement.findBySession(session._id);
          return {
            ...session,
            movements_count: movements.length,
            movements,
          };
        })
      );

      return ResponseHandler.success(res, {
        sessions: enrichedSessions,
        count: enrichedSessions.length,
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  // Rapport de fin de journée
  async getDailyReport(req, res) {
    try {
      const cashierId = req.user.id;
      const { date = new Date().toISOString().split('T')[0] } = req.query;

      const startDate = new Date(`${date}T00:00:00.000Z`);
      const endDate = new Date(`${date}T23:59:59.999Z`);

      // Sessions du jour
      const sessions = await DrawerSession.findByDateRange(startDate, endDate);
      const cashierSessions = sessions.filter((s) => s.cashier_id === cashierId);

      // Mouvements du jour
      const movements = await DrawerMovement.findByDateRange(startDate, endDate);
      const cashierMovements = movements.filter((m) => m.cashier_id === cashierId);

      // Calculs
      const totalSessions = cashierSessions.length;
      const totalOpeningAmount = cashierSessions.reduce((sum, s) => sum + s.opening_amount, 0);
      const totalClosingAmount = cashierSessions.reduce(
        (sum, s) => sum + (s.closing_amount || 0),
        0
      );
      const totalVariance = cashierSessions.reduce((sum, s) => sum + (s.variance || 0), 0);

      const movementsIn = cashierMovements.filter((m) => m.type === 'in');
      const movementsOut = cashierMovements.filter((m) => m.type === 'out');
      const totalMovementsIn = movementsIn.reduce((sum, m) => sum + m.amount, 0);
      const totalMovementsOut = movementsOut.reduce((sum, m) => sum + m.amount, 0);

      const report = {
        date,
        cashier: req.user.username,
        summary: {
          total_sessions: totalSessions,
          total_opening_amount: Math.round(totalOpeningAmount * 100) / 100,
          total_closing_amount: Math.round(totalClosingAmount * 100) / 100,
          total_variance: Math.round(totalVariance * 100) / 100,
          total_movements_in: Math.round(totalMovementsIn * 100) / 100,
          total_movements_out: Math.round(totalMovementsOut * 100) / 100,
          movements_count: cashierMovements.length,
        },
        sessions: cashierSessions,
        movements: {
          all: cashierMovements.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
          in: movementsIn,
          out: movementsOut,
        },
        generated_at: new Date(),
      };

      return ResponseHandler.success(res, report);
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }
}

module.exports = new DrawerController();
