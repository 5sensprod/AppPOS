const express = require('express');
    const router = express.Router();
    const db = new (require('sqlite3').verbose().Database)('./data/sales.db');

    // Routes CRUD pour les ventes
    router.get('/', (req, res) => {
      db.all('SELECT * FROM sales', [], (err, rows) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.json(rows);
      });
    });

    router.post('/', (req, res) => {
      db.run('INSERT INTO sales (product_id, quantity, price) VALUES (?, ?, ?)', [req.body.product_id, req.body.quantity, req.body.price], function(err) {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.json({ id: this.lastID });
      });
    });

    router.put('/:id', (req, res) => {
      db.run('UPDATE sales SET product_id = ?, quantity = ?, price = ? WHERE id = ?', [req.body.product_id, req.body.quantity, req.body.price, req.params.id], function(err) {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.json({ changes: this.changes });
      });
    });

    router.delete('/:id', (req, res) => {
      db.run('DELETE FROM sales WHERE id = ?', [req.params.id], function(err) {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.json({ changes: this.changes });
      });
    });

    module.exports = router;
