// models/Sale.js
const BaseModel = require('./base/BaseModel');
const db = require('../config/database');

class Sale extends BaseModel {
  constructor() {
    super(db.sales, 'sales'); // Nouvelle collection sales
  }

  getDefaultValues() {
    return {
      transaction_id: this.generateTransactionId(),
      items: [],
      subtotal: 0,
      tax_amount: 0,
      total_amount: 0,
      payment_method: 'cash',
      status: 'completed',
      created_at: new Date(),
      updated_at: new Date(),
    };
  }

  generateTransactionId() {
    const now = new Date();
    const date = now.toISOString().slice(0, 10).replace(/-/g, '');
    const time = now.toTimeString().slice(0, 8).replace(/:/g, '');
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `TXN_${date}_${time}_${random}`;
  }

  // Méthodes spécifiques aux ventes
  async findByDateRange(startDate, endDate) {
    const query = {
      created_at: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    };
    return this.find(query);
  }

  async findByCashier(cashierId) {
    return this.find({ cashier_id: cashierId });
  }

  async getTodaysSales() {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    return this.findByDateRange(startOfDay, endOfDay);
  }
}

module.exports = new Sale();
