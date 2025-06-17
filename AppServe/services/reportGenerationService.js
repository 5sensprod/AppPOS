// AppServe/services/reportGenerationService.js
const SessionReport = require('../models/SessionReport');
const DrawerSession = require('../models/DrawerSession');
const DrawerMovement = require('../models/DrawerMovement');
const Sale = require('../models/Sale');

class ReportGenerationService {
  async generateCompleteSessionReport(sessionId, closingData = null) {
    try {
      console.log(`📊 [REPORT] Génération rapport pour session ${sessionId}`);

      // 1. Récupérer la session drawer
      const session = await DrawerSession.findById(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} non trouvée`);
      }

      // 2. Récupérer tous les mouvements de la session
      const movements = await DrawerMovement.findBySession(sessionId);

      // 3. Récupérer toutes les ventes de la session
      const sessionStart = new Date(session.opened_at);
      const sessionEnd = closingData ? new Date() : new Date();

      const sales = await Sale.find({
        cashier_id: session.cashier_id,
        created_at: {
          $gte: sessionStart,
          $lte: sessionEnd,
        },
      });

      // 4. Calculer les statistiques
      const stats = this.calculateSessionStats(session, movements, sales, closingData);

      // 5. Construire le rapport complet
      const reportData = {
        session_id: sessionId,
        cashier_id: session.cashier_id,
        cashier_name: session.cashier_name,
        session_date: new Date(session.opened_at).toISOString().split('T')[0],
        session_start: session.opened_at,
        session_end: sessionEnd,
        session_duration: Math.floor((sessionEnd - sessionStart) / (1000 * 60)),

        // Fond de caisse
        opening_amount: session.opening_amount,
        closing_amount: closingData?.counted_amount || session.opening_amount,
        expected_amount: closingData?.expected_amount || stats.expectedAmount,
        variance: closingData?.variance || 0,
        counting_method: closingData?.method || session.method || 'custom',
        denominations: closingData?.denominations || session.denominations || {},

        // Ventes
        total_sales: stats.totalSales,
        sales_count: stats.salesCount,
        cash_sales: stats.cashSales,
        card_sales: stats.cardSales,
        mixed_sales: stats.mixedSales,

        // Mouvements
        total_movements_in: stats.totalMovementsIn,
        total_movements_out: stats.totalMovementsOut,
        movements_count: movements.length,
        movements: movements.map((m) => ({
          type: m.type,
          amount: m.amount,
          reason: m.reason,
          notes: m.notes,
          created_at: m.created_at,
          created_by: m.created_by,
        })),

        // Métadonnées
        sales_data: sales.map((s) => ({
          transaction_id: s.transaction_id,
          total_amount: s.total_amount,
          payment_method: s.payment_method,
          items_count: s.items?.length || 0,
          created_at: s.created_at,
        })),
        variance_accepted: closingData?.variance_accepted || false,
        closing_notes: closingData?.notes || null,
        generated_at: new Date(),
      };

      // 6. Sauvegarder le rapport
      const savedReport = await SessionReport.create(reportData);

      console.log(`✅ [REPORT] Rapport sauvegardé: ${savedReport._id}`);
      return savedReport;
    } catch (error) {
      console.error(`❌ [REPORT] Erreur génération rapport:`, error);
      throw error;
    }
  }

  calculateSessionStats(session, movements, sales, closingData) {
    // Calculs mouvements
    const totalMovementsIn = movements
      .filter((m) => m.type === 'in')
      .reduce((sum, m) => sum + m.amount, 0);

    const totalMovementsOut = movements
      .filter((m) => m.type === 'out')
      .reduce((sum, m) => sum + m.amount, 0);

    // Calculs ventes
    const totalSales = sales.reduce((sum, s) => sum + s.total_amount, 0);
    const salesCount = sales.length;

    const cashSales = sales
      .filter((s) => s.payment_method === 'cash')
      .reduce((sum, s) => sum + s.total_amount, 0);

    const cardSales = sales
      .filter((s) => s.payment_method === 'card')
      .reduce((sum, s) => sum + s.total_amount, 0);

    const mixedSales = sales
      .filter((s) => s.payment_method === 'mixed')
      .reduce((sum, s) => sum + s.total_amount, 0);

    // Montant attendu en caisse
    const expectedAmount =
      session.opening_amount + cashSales + totalMovementsIn - totalMovementsOut;

    return {
      totalMovementsIn: Math.round(totalMovementsIn * 100) / 100,
      totalMovementsOut: Math.round(totalMovementsOut * 100) / 100,
      totalSales: Math.round(totalSales * 100) / 100,
      salesCount,
      cashSales: Math.round(cashSales * 100) / 100,
      cardSales: Math.round(cardSales * 100) / 100,
      mixedSales: Math.round(mixedSales * 100) / 100,
      expectedAmount: Math.round(expectedAmount * 100) / 100,
    };
  }

  async getSessionReport(sessionId) {
    try {
      const report = await SessionReport.findBySessionId(sessionId);
      return report;
    } catch (error) {
      console.error(`❌ [REPORT] Erreur récupération rapport:`, error);
      throw error;
    }
  }

  async getHistoricalReports(filters = {}) {
    try {
      const { cashier_id, start_date, end_date, limit = 50 } = filters;

      let reports;

      if (start_date && end_date) {
        reports = await SessionReport.findByDateRange(start_date, end_date, cashier_id);
      } else if (cashier_id) {
        reports = await SessionReport.findByCashier(cashier_id, limit);
      } else {
        reports = await SessionReport.findAll({ limit: parseInt(limit) });
      }

      return reports.sort((a, b) => new Date(b.session_date) - new Date(a.session_date));
    } catch (error) {
      console.error(`❌ [REPORT] Erreur récupération historique:`, error);
      throw error;
    }
  }
}

module.exports = new ReportGenerationService();
