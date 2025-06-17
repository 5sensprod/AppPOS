// AppServe/models/SessionReport.js
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

  // Méthodes spécifiques aux rapports
  async findByDateRange(startDate, endDate, cashierId = null) {
    const query = {
      session_date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    };

    if (cashierId) {
      query.cashier_id = cashierId;
    }

    return this.find(query);
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
    };
  }
}

module.exports = new SessionReport();
