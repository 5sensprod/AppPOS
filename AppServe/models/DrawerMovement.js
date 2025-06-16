// AppServe/models/DrawerMovement.js
const BaseModel = require('./base/BaseModel');
const db = require('../config/database');

class DrawerMovement extends BaseModel {
  constructor() {
    super(db.drawer_movements, 'drawer_movements');
  }

  getDefaultValues() {
    return {
      drawer_session_id: null,
      cashier_id: null,
      type: null, // 'in' ou 'out'
      amount: 0,
      reason: null,
      notes: null,
      created_at: new Date(),
      created_by: null,
    };
  }

  // Méthodes spécifiques aux mouvements
  async findBySession(sessionId) {
    return this.find({ drawer_session_id: sessionId });
  }

  async findByCashier(cashierId) {
    return this.find({ cashier_id: cashierId });
  }

  async findByDateRange(startDate, endDate) {
    const query = {
      created_at: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    };
    return this.find(query);
  }

  async getTodaysMovements(cashierId = null) {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const query = {
      created_at: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    };

    if (cashierId) {
      query.cashier_id = cashierId;
    }

    return this.find(query);
  }
}

module.exports = new DrawerMovement();
