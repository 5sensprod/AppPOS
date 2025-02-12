const express = require('express');
    const router = express.Router();
    const db = new (require('sqlite3').verbose().Database)('./data/users.db');

    // Routes CRUD pour les utilisateurs
    router.get('/', (req, res) => {
      db.all('SELECT * FROM users', [], (err, rows) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.json(rows);
      });
    });

    router.post('/', (req, res) => {
      db.run('INSERT INTO users (name, role) VALUES (?, ?)', [req.body.name, req.body.role], function(err) {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.json({ id: this.lastID });
      });
    });

    router.put('/:id', (req, res) => {
      db.run('UPDATE users SET name = ?, role = ? WHERE id = ?', [req.body.name, req.body.role, req.params.id], function(err) {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.json({ changes: this.changes });
      });
    });

    router.delete('/:id', (req, res) => {
      db.run('DELETE FROM users WHERE id = ?', [req.params.id], function(err) {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.json({ changes: this.changes });
      });
    });

    module.exports = router;
