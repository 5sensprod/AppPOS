// AppServe/services/reportGenerationService.js - VERSION AVEC RÉDUCTIONS
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

      // 3. Récupérer toutes les ventes de la session AVEC ARTICLES DÉTAILLÉS
      const sessionStart = new Date(session.opened_at);
      const sessionEnd = closingData ? new Date() : new Date();

      const sales = await Sale.find({
        cashier_id: session.cashier_id,
        created_at: {
          $gte: sessionStart,
          $lte: sessionEnd,
        },
      });

      // 4. Calculer les statistiques (avec réductions)
      const stats = this.calculateSessionStats(session, movements, sales, closingData);

      // 🆕 5. Calculer les statistiques de réductions
      const discountStats = this.calculateDiscountStatistics(sales);

      // 6. Construire le rapport complet
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

        // 🆕 NOUVEAUX CHAMPS RÉDUCTIONS
        total_discounts: discountStats.total_discounts,
        item_discounts_total: discountStats.item_discounts_total,
        ticket_discounts_total: discountStats.ticket_discounts_total,
        discounts_count: discountStats.discounts_count,
        avg_discount_per_sale: discountStats.avg_discount_per_sale,
        sales_with_discounts: discountStats.sales_with_discounts,
        discount_breakdown: discountStats.discount_breakdown,
        top_discount_reasons: discountStats.top_discount_reasons,

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

        // Métadonnées avec articles détaillés
        sales_data: sales.map((s) => ({
          transaction_id: s.transaction_id,
          total_amount: s.total_amount,
          payment_method: s.payment_method,
          items_count: s.items?.length || 0,
          created_at: s.created_at,
          items: s.items || [],

          // 🆕 AJOUT DONNÉES RÉDUCTIONS PAR VENTE
          total_discounts: s.total_discounts || 0,
          item_discounts_total: s.item_discounts_total || 0,
          ticket_discount: s.ticket_discount || { type: null, amount: 0, reason: null },
        })),

        variance_accepted: closingData?.variance_accepted || false,
        closing_notes: closingData?.notes || null,
        generated_at: new Date(),
      };

      // 7. Sauvegarder le rapport
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

  // 🆕 NOUVELLE MÉTHODE : Calculer les statistiques de réductions
  calculateDiscountStatistics(sales) {
    const stats = {
      total_discounts: 0,
      item_discounts_total: 0,
      ticket_discounts_total: 0,
      discounts_count: 0,
      avg_discount_per_sale: 0,
      sales_with_discounts: 0,
      discount_breakdown: {
        percentage_discounts: 0,
        fixed_discounts: 0,
        item_percentage: 0,
        item_fixed: 0,
        ticket_percentage: 0,
        ticket_fixed: 0,
      },
      top_discount_reasons: {},
    };

    if (sales.length === 0) {
      return stats;
    }

    // Parcourir toutes les ventes
    sales.forEach((sale) => {
      const saleHasDiscounts = (sale.total_discounts || 0) > 0;

      if (saleHasDiscounts) {
        stats.sales_with_discounts++;
        stats.total_discounts += sale.total_discounts || 0;
        stats.item_discounts_total += sale.item_discounts_total || 0;

        // Réduction ticket
        const ticketDiscount = sale.ticket_discount;
        if (ticketDiscount && ticketDiscount.amount > 0) {
          stats.ticket_discounts_total += ticketDiscount.amount;

          // Breakdown par type
          if (ticketDiscount.type === 'percentage') {
            stats.discount_breakdown.ticket_percentage += ticketDiscount.amount;
            stats.discount_breakdown.percentage_discounts += ticketDiscount.amount;
          } else if (ticketDiscount.type === 'fixed') {
            stats.discount_breakdown.ticket_fixed += ticketDiscount.amount;
            stats.discount_breakdown.fixed_discounts += ticketDiscount.amount;
          }

          // Top motifs
          if (ticketDiscount.reason) {
            stats.top_discount_reasons[ticketDiscount.reason] =
              (stats.top_discount_reasons[ticketDiscount.reason] || 0) + ticketDiscount.amount;
          }
        }

        // Réductions items
        if (sale.items && sale.items.length > 0) {
          sale.items.forEach((item) => {
            if (item.discount && item.discount.amount > 0) {
              const discount = item.discount;

              // Breakdown par type
              if (discount.type === 'percentage') {
                stats.discount_breakdown.item_percentage += discount.amount;
                stats.discount_breakdown.percentage_discounts += discount.amount;
              } else if (discount.type === 'fixed') {
                stats.discount_breakdown.item_fixed += discount.amount;
                stats.discount_breakdown.fixed_discounts += discount.amount;
              }

              // Top motifs
              if (discount.reason) {
                stats.top_discount_reasons[discount.reason] =
                  (stats.top_discount_reasons[discount.reason] || 0) + discount.amount;
              }
            }
          });
        }
      }
    });

    // Calculs finaux
    stats.discounts_count = stats.sales_with_discounts;
    stats.avg_discount_per_sale =
      stats.sales_with_discounts > 0 ? stats.total_discounts / stats.sales_with_discounts : 0;

    // Arrondir tous les montants
    stats.total_discounts = Math.round(stats.total_discounts * 100) / 100;
    stats.item_discounts_total = Math.round(stats.item_discounts_total * 100) / 100;
    stats.ticket_discounts_total = Math.round(stats.ticket_discounts_total * 100) / 100;
    stats.avg_discount_per_sale = Math.round(stats.avg_discount_per_sale * 100) / 100;

    // Arrondir breakdown
    Object.keys(stats.discount_breakdown).forEach((key) => {
      stats.discount_breakdown[key] = Math.round(stats.discount_breakdown[key] * 100) / 100;
    });

    // Arrondir top reasons et trier
    const sortedReasons = Object.entries(stats.top_discount_reasons)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10) // Top 10
      .reduce((obj, [reason, amount]) => {
        obj[reason] = Math.round(amount * 100) / 100;
        return obj;
      }, {});

    stats.top_discount_reasons = sortedReasons;

    return stats;
  }

  // 🆕 NOUVELLE MÉTHODE : Analyser les réductions par période
  async getDiscountAnalytics(cashierId = null, startDate = null, endDate = null) {
    try {
      const reports = await SessionReport.findByDateRange(
        startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate || new Date(),
        cashierId
      );

      const analytics = {
        summary: {
          total_sessions: reports.length,
          sessions_with_discounts: reports.filter((r) => (r.total_discounts || 0) > 0).length,
          total_sales: reports.reduce((sum, r) => sum + r.total_sales, 0),
          total_discounts: reports.reduce((sum, r) => sum + (r.total_discounts || 0), 0),
          discount_rate: 0,
          penetration_rate: 0,
        },

        trends: {
          daily_discount_rate: {},
          weekly_totals: {},
          top_reasons_period: {},
        },

        performance: {
          best_discount_day: null,
          avg_discount_per_session: 0,
          most_used_reason: null,
        },
      };

      // Calculs summary
      if (analytics.summary.total_sales > 0) {
        analytics.summary.discount_rate =
          (analytics.summary.total_discounts / analytics.summary.total_sales) * 100;
      }

      if (analytics.summary.total_sessions > 0) {
        analytics.summary.penetration_rate =
          (analytics.summary.sessions_with_discounts / analytics.summary.total_sessions) * 100;
      }

      // Analyse tendances (simplifié)
      const allReasons = {};
      reports.forEach((report) => {
        if (report.top_discount_reasons) {
          Object.entries(report.top_discount_reasons).forEach(([reason, amount]) => {
            allReasons[reason] = (allReasons[reason] || 0) + amount;
          });
        }
      });

      analytics.trends.top_reasons_period = Object.entries(allReasons)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .reduce((obj, [reason, amount]) => {
          obj[reason] = Math.round(amount * 100) / 100;
          return obj;
        }, {});

      // Performance
      analytics.performance.avg_discount_per_session =
        analytics.summary.total_sessions > 0
          ? analytics.summary.total_discounts / analytics.summary.total_sessions
          : 0;

      const topReason = Object.keys(allReasons)[0];
      analytics.performance.most_used_reason = topReason || null;

      // Arrondir les valeurs
      analytics.summary.discount_rate = Math.round(analytics.summary.discount_rate * 100) / 100;
      analytics.summary.penetration_rate =
        Math.round(analytics.summary.penetration_rate * 100) / 100;
      analytics.performance.avg_discount_per_session =
        Math.round(analytics.performance.avg_discount_per_session * 100) / 100;

      return analytics;
    } catch (error) {
      console.error(`❌ [REPORT] Erreur analyse réductions:`, error);
      throw error;
    }
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
