// utils/categoryHelpers.js
const db = require('../config/database');

async function calculateLevel(parent_id) {
  if (!parent_id) return 0;

  const parent = await new Promise((resolve, reject) => {
    db.categories.findOne({ _id: parent_id }, (err, doc) => {
      if (err) reject(err);
      resolve(doc);
    });
  });

  return parent ? (parent.level || 0) + 1 : 0;
}

module.exports = { calculateLevel };
