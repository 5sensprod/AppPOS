const express = require('express');
    const router = express.Router();
    const { SerialPort } = require('serialport');

    const port = new SerialPort({
      path: '/dev/tty-usbserial1',
      baudRate: 9600
    });

    router.post('/', (req, res) => {
      port.write(req.body.data, (err) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.json({ success: true });
      });
    });

    module.exports = router;
