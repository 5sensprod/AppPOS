// AppServe/models/DrawerSession.js
const BaseModel = require('./base/BaseModel');
const db = require('../config/database');

class DrawerSession extends BaseModel {
  constructor() {
    super(db.drawer_sessions, 'drawer_sessions');
  }

  getDefaultValues() {
    return {
      cashier_id: null,
      cashier_name: null,
      opening_amount: 0,
      closing_amount: null,
      expected_amount: 0,
      variance: 0,
      denominations: {},
      method: 'custom', // 'detailed' ou 'custom'
      notes: null,
      opened_at: new Date(),
      closed_at: null,
      status: 'open', // 'open', 'closed'
      created_at: new Date(),
      updated_at: new Date(),
    };
  }

  // Méthodes spécifiques aux sessions drawer
  async findByDateRange(startDate, endDate) {
    const query = {
      opened_at: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    };
    return this.find(query);
  }

  async findByCashier(cashierId) {
    return this.find({ cashier_id: cashierId });
  }

  async findOpenSession(cashierId) {
    return this.promisifyCall(this.collection.findOne, {
      cashier_id: cashierId,
      status: 'open',
    });
  }

  async closeSession(sessionId, closingData) {
    const updateData = {
      ...closingData,
      status: 'closed',
      closed_at: new Date(),
      updated_at: new Date(),
    };
    return this.update(sessionId, updateData);
  }

  async getTodaysSessions() {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));
    return this.findByDateRange(startOfDay, endOfDay);
  }
}

module.exports = new DrawerSession();
