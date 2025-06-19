// AppServe/models/SessionReport.js - VERSION MISE À JOUR
const BaseModel = require('./base/BaseModel');
const db = require('../config/database');

class SessionReport extends BaseModel {
  constructor() {
    super(db.session_reports, 'session_reports');
  }

  getDefaultValues() {
    return {
      session_id: null,
      cashier_id: null,
      cashier_name: null,
      session_date: null,
      session_start: null,
      session_end: null,
      session_duration: 0,

      // Fond de caisse
      opening_amount: 0,
      closing_amount: 0,
      expected_amount: 0,
      variance: 0,
      counting_method: 'custom',
      denominations: {},

      // Ventes
      total_sales: 0,
      sales_count: 0,
      cash_sales: 0,
      card_sales: 0,
      mixed_sales: 0,

      // 🆕 NOUVEAUX CHAMPS RÉDUCTIONS
      total_discounts: 0, // Montant total des réductions
      item_discounts_total: 0, // Total réductions sur items
      ticket_discounts_total: 0, // Total réductions ticket global
      discounts_count: 0, // Nombre de ventes avec réductions
      avg_discount_per_sale: 0, // Réduction moyenne
      sales_with_discounts: 0, // Nombre de ventes avec réductions

      // Détail par type de réduction
      discount_breakdown: {
        percentage_discounts: 0, // Montant réductions en %
        fixed_discounts: 0, // Montant réductions fixes
        item_percentage: 0, // Réductions % sur items
        item_fixed: 0, // Réductions fixes sur items
        ticket_percentage: 0, // Réductions % sur ticket
        ticket_fixed: 0, // Réductions fixes sur ticket
      },

      // Top motifs de réduction
      top_discount_reasons: {}, // { "motif": montant }

      // Mouvements
      total_movements_in: 0,
      total_movements_out: 0,
      movements_count: 0,
      movements: [],

      // Métadonnées
      sales_data: [],
      variance_accepted: false,
      closing_notes: null,
      generated_at: new Date(),
      created_at: new Date(),
    };
  }

  // Méthodes spécifiques aux rapports (inchangées)
  async findByDateRange(startDate, endDate, cashierId = null) {
    console.log('🔍 [DEBUG] findByDateRange appelée avec:');
    console.log('- startDate:', startDate);
    console.log('- endDate:', endDate);
    console.log('- cashierId:', cashierId);

    // ✅ CONVERSION DES DATES EN FORMAT STRING YYYY-MM-DD
    const startDateString = startDate.toISOString().split('T')[0]; // "2024-06-19"
    const endDateString = endDate.toISOString().split('T')[0]; // "2025-06-19"

    console.log('🔍 [DEBUG] Dates converties:');
    console.log('- startDateString:', startDateString);
    console.log('- endDateString:', endDateString);

    const query = {
      session_date: {
        $gte: startDateString,
        $lte: endDateString,
      },
    };

    if (cashierId) {
      query.cashier_id = cashierId;
    }

    console.log('🔍 [DEBUG] Requête finale:', JSON.stringify(query, null, 2));

    const results = await this.find(query);

    console.log('🔍 [DEBUG] Résultats findByDateRange:');
    console.log('- Nombre trouvé:', results.length);
    if (results.length > 0) {
      console.log('- Premier résultat session_date:', results[0].session_date);
      console.log('- Premier résultat total_discounts:', results[0].total_discounts || 0);
    }

    return results;
  }

  async findByCashier(cashierId, limit = 50) {
    return this.find(
      { cashier_id: cashierId },
      {
        sort: { session_date: -1 },
        limit: parseInt(limit),
      }
    );
  }

  async findBySessionId(sessionId) {
    return this.promisifyCall(this.collection.findOne, { session_id: sessionId });
  }

  async getTodaysReports() {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));
    return this.findByDateRange(startOfDay, endOfDay);
  }

  // 🆕 NOUVELLE MÉTHODE : Stats réductions
  async getDiscountStats(cashierId = null, days = 30) {
    console.log('🔍 [DEBUG] getDiscountStats appelée avec:', { cashierId, days });

    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    console.log('🔍 [DEBUG] Dates calculées:');
    console.log('- startDate:', startDate.toISOString());
    console.log('- endDate:', endDate.toISOString());
    console.log('- startDate (local):', startDate.toLocaleDateString('fr-FR'));
    console.log('- endDate (local):', endDate.toLocaleDateString('fr-FR'));

    console.log('🔍 [DEBUG] Appel findByDateRange...');
    const reports = await this.findByDateRange(startDate, endDate, cashierId);
    console.log('🔍 [DEBUG] Rapports trouvés par findByDateRange:', reports.length);

    if (reports.length > 0) {
      console.log('🔍 [DEBUG] Premier rapport trouvé:');
      console.log('- _id:', reports[0]._id);
      console.log('- session_date:', reports[0].session_date);
      console.log('- cashier_id:', reports[0].cashier_id);
      console.log('- total_discounts:', reports[0].total_discounts || 0);
    }

    // Si aucun rapport trouvé par findByDateRange, testons findByCashier
    if (reports.length === 0) {
      console.log('🔍 [DEBUG] Test findByCashier comme fallback...');
      const allCashierReports = await this.findByCashier(cashierId, 5);
      console.log('🔍 [DEBUG] Rapports findByCashier:', allCashierReports.length);

      if (allCashierReports.length > 0) {
        console.log('🔍 [DEBUG] Premier rapport findByCashier:');
        console.log('- _id:', allCashierReports[0]._id);
        console.log('- session_date:', allCashierReports[0].session_date);
        console.log('- session_date type:', typeof allCashierReports[0].session_date);
        console.log('- cashier_id:', allCashierReports[0].cashier_id);
        console.log('- created_at:', allCashierReports[0].created_at);
        console.log('- generated_at:', allCashierReports[0].generated_at);
      }
    }

    const stats = {
      total_reports: reports.length,
      total_discounts: 0,
      total_sales: 0,
      sales_with_discounts: 0,
      avg_discount_rate: 0,

      item_vs_ticket: {
        item_discounts: 0,
        ticket_discounts: 0,
      },

      top_reasons: {},
      daily_stats: {},

      // 🆕 DEBUG INFO
      debug_findByDateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        reportsFound: reports.length,
        cashierId: cashierId,
      },
    };

    if (reports.length === 0) {
      console.log('❌ [DEBUG] Aucun rapport trouvé - retour stats vides');
      return stats;
    }

    // Calculs normaux si rapports trouvés
    reports.forEach((report) => {
      stats.total_sales += report.total_sales || 0;
      stats.total_discounts += report.total_discounts || 0;
      stats.sales_with_discounts += report.sales_with_discounts || 0;

      // Item vs ticket
      stats.item_vs_ticket.item_discounts += report.item_discounts_total || 0;
      stats.item_vs_ticket.ticket_discounts += report.ticket_discounts_total || 0;

      // Top reasons
      if (report.top_discount_reasons) {
        Object.entries(report.top_discount_reasons).forEach(([reason, amount]) => {
          stats.top_reasons[reason] = (stats.top_reasons[reason] || 0) + amount;
        });
      }
    });

    // Calculs finaux
    stats.avg_discount_rate =
      stats.total_sales > 0 ? (stats.total_discounts / stats.total_sales) * 100 : 0;

    // Arrondir
    stats.total_discounts = Math.round(stats.total_discounts * 100) / 100;
    stats.total_sales = Math.round(stats.total_sales * 100) / 100;
    stats.avg_discount_rate = Math.round(stats.avg_discount_rate * 100) / 100;

    Object.keys(stats.top_reasons).forEach((reason) => {
      stats.top_reasons[reason] = Math.round(stats.top_reasons[reason] * 100) / 100;
    });

    console.log('✅ [DEBUG] Stats calculées:', stats);
    return stats;
  }

  // 🆕 MÉTHODE HELPER : Agréger les motifs de réduction
  aggregateDiscountReasons(reports) {
    const reasons = {};

    reports.forEach((report) => {
      if (report.top_discount_reasons) {
        Object.entries(report.top_discount_reasons).forEach(([reason, amount]) => {
          reasons[reason] = (reasons[reason] || 0) + amount;
        });
      }
    });

    // Trier par montant décroissant
    return Object.entries(reasons)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10) // Top 10
      .reduce((obj, [reason, amount]) => {
        obj[reason] = Math.round(amount * 100) / 100;
        return obj;
      }, {});
  }

  // 🆕 MÉTHODE HELPER : Stats quotidiennes
  calculateDailyDiscountStats(reports) {
    const dailyStats = {};

    reports.forEach((report) => {
      const date = new Date(report.session_date).toISOString().split('T')[0];

      if (!dailyStats[date]) {
        dailyStats[date] = {
          total_sales: 0,
          total_discounts: 0,
          sales_count: 0,
          sales_with_discounts: 0,
        };
      }

      dailyStats[date].total_sales += report.total_sales;
      dailyStats[date].total_discounts += report.total_discounts || 0;
      dailyStats[date].sales_count += report.sales_count;
      dailyStats[date].sales_with_discounts += report.sales_with_discounts || 0;
    });

    // Calculer les taux
    Object.keys(dailyStats).forEach((date) => {
      const stats = dailyStats[date];
      stats.discount_rate =
        stats.total_sales > 0 ? (stats.total_discounts / stats.total_sales) * 100 : 0;
      stats.discount_penetration =
        stats.sales_count > 0 ? (stats.sales_with_discounts / stats.sales_count) * 100 : 0;

      // Arrondir
      stats.discount_rate = Math.round(stats.discount_rate * 100) / 100;
      stats.discount_penetration = Math.round(stats.discount_penetration * 100) / 100;
    });

    return dailyStats;
  }

  async getReportStats(cashierId = null, days = 30) {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    const reports = await this.findByDateRange(startDate, endDate, cashierId);

    return {
      total_reports: reports.length,
      total_sales: reports.reduce((sum, r) => sum + r.total_sales, 0),
      average_sales: reports.length
        ? reports.reduce((sum, r) => sum + r.total_sales, 0) / reports.length
        : 0,
      total_variance: reports.reduce((sum, r) => sum + Math.abs(r.variance), 0),
      sessions_with_variance: reports.filter((r) => Math.abs(r.variance) > 0.01).length,

      // 🆕 STATS RÉDUCTIONS
      total_discounts: reports.reduce((sum, r) => sum + (r.total_discounts || 0), 0),
      sessions_with_discounts: reports.filter((r) => (r.total_discounts || 0) > 0).length,
      avg_discount_per_session: reports.length
        ? reports.reduce((sum, r) => sum + (r.total_discounts || 0), 0) / reports.length
        : 0,
    };
  }
}

module.exports = new SessionReport();
