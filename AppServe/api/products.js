const express = require('express');
    const router = express.Router();
    const db = new (require('sqlite3').verbose().Database)('./data/products.db');

    // Routes CRUD pour les produits
    router.get('/', (req, res) => {
      db.all('SELECT * FROM products', [], (err, rows) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.json(rows);
      });
    });

    router.post('/', (req, res) => {
      db.run('INSERT INTO products (name, price) VALUES (?, ?)', [req.body.name, req.body.price], function(err) {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.json({ id: this.lastID });
      });
    });

    router.put('/:id', (req, res) => {
      db.run('UPDATE products SET name = ?, price = ? WHERE id = ?', [req.body.name, req.body.price, req.params.id], function(err) {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.json({ changes: this.changes });
      });
    });

    router.delete('/:id', (req, res) => {
      db.run('DELETE FROM products WHERE id = ?', [req.params.id], function(err) {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.json({ changes: this.changes });
      });
    });

    module.exports = router;
