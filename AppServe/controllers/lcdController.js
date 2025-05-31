// controllers/lcdController.js - Version optimisée
const lcdDisplayService = require('../services/lcdDisplayService');
const ResponseHandler = require('../handlers/ResponseHandler');

class LCDController {
  async listPorts(req, res) {
    try {
      const ports = await lcdDisplayService.listAvailablePorts();
      return ResponseHandler.success(res, {
        message: `${ports.length} port(s) détecté(s)`,
        ports,
        platform: process.platform,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async connect(req, res) {
    try {
      const { port_path, config = {} } = req.body;
      if (!port_path) {
        return ResponseHandler.badRequest(res, 'Le chemin du port est requis');
      }

      const result = await lcdDisplayService.connectToDisplay(port_path, config);
      return ResponseHandler.success(res, {
        message: result.message,
        connection: {
          port: port_path,
          config: result.config,
          status: 'connected',
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async writeMessage(req, res) {
    try {
      const { line1 = '', line2 = '' } = req.body;
      const result = await lcdDisplayService.writeToDisplay(line1, line2);
      return ResponseHandler.success(res, {
        message: result.message,
        content: result.content,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async clearDisplay(req, res) {
    try {
      await lcdDisplayService.clearDisplay();
      return ResponseHandler.success(res, {
        message: 'Écran effacé',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async getStatus(req, res) {
    try {
      const status = lcdDisplayService.getStatus();
      return ResponseHandler.success(res, {
        status,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async disconnect(req, res) {
    try {
      lcdDisplayService.disconnect();
      return ResponseHandler.success(res, {
        message: 'Écran LCD déconnecté',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async showPrice(req, res) {
    try {
      const { item_name, price } = req.body;
      if (price === undefined || price === null) {
        return ResponseHandler.badRequest(res, 'Le prix est requis');
      }

      const result = await lcdDisplayService.showPrice(item_name || 'Article', price);
      return ResponseHandler.success(res, {
        message: 'Prix affiché',
        content: result.content,
        item_name,
        price: parseFloat(price),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async showTotal(req, res) {
    try {
      const { total } = req.body;
      if (total === undefined || total === null) {
        return ResponseHandler.badRequest(res, 'Le total est requis');
      }

      const result = await lcdDisplayService.showTotal(total);
      return ResponseHandler.success(res, {
        message: 'Total affiché',
        content: result.content,
        total: parseFloat(total),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async showWelcome(req, res) {
    try {
      const result = await lcdDisplayService.showWelcomeMessage();
      return ResponseHandler.success(res, {
        message: 'Message de bienvenue affiché',
        content: result.content,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async showThankYou(req, res) {
    try {
      const result = await lcdDisplayService.showThankYou();
      return ResponseHandler.success(res, {
        message: 'Message de remerciement affiché',
        content: result.content,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async showError(req, res) {
    try {
      const { error_message = 'Erreur' } = req.body;
      const result = await lcdDisplayService.showError(error_message);
      return ResponseHandler.success(res, {
        message: "Message d'erreur affiché",
        content: result.content,
        error_message,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async testDisplay(req, res) {
    try {
      const testSequence = [
        { line1: 'TEST LCD', line2: 'Demarrage...' },
        { line1: 'Test caracteres', line2: 'ABCDEFGHIJ1234567890' },
        { line1: 'Prix test', line2: '99.99EUR' },
        { line1: 'TOTAL', line2: '156.78EUR' },
        { line1: 'Test termine', line2: 'Succes !' },
      ];

      const results = [];
      for (const [index, test] of testSequence.entries()) {
        const result = await lcdDisplayService.writeToDisplay(test.line1, test.line2);
        results.push({
          step: index + 1,
          content: result.content,
          success: result.success,
        });
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      await lcdDisplayService.showWelcomeMessage();
      return ResponseHandler.success(res, {
        message: 'Test complet terminé',
        test_results: results,
        total_steps: testSequence.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }
}

module.exports = LCDController;
