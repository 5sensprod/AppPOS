// AppServe/routes/reportsRoutes.js
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../utils/auth');
const ResponseHandler = require('../handlers/ResponseHandler');
const reportGenerationService = require('../services/reportGenerationService');
const SessionReport = require('../models/SessionReport');

// Toutes les routes protégées par authentification
router.use(authMiddleware);

// Historique des rapports
router.get('/history', async (req, res) => {
  try {
    const { start_date, end_date, limit = 50, offset = 0 } = req.query;

    const cashier_id = req.user.id; // Filtrer par caissier connecté

    const filters = {
      cashier_id,
      start_date,
      end_date,
      limit: parseInt(limit),
      offset: parseInt(offset),
    };

    const reports = await reportGenerationService.getHistoricalReports(filters);

    // Compter le total pour la pagination
    const totalReports = await SessionReport.find({ cashier_id });

    return ResponseHandler.success(res, {
      reports,
      total: totalReports.length,
      limit: parseInt(limit),
      offset: parseInt(offset),
      has_more: reports.length === parseInt(limit),
    });
  } catch (error) {
    return ResponseHandler.error(res, error);
  }
});

// Rapport par ID
router.get('/:reportId', async (req, res) => {
  try {
    const { reportId } = req.params;
    const report = await SessionReport.findById(reportId);

    if (!report) {
      return ResponseHandler.notFound(res, 'Rapport non trouvé');
    }

    // Vérifier que le rapport appartient au caissier connecté
    if (report.cashier_id !== req.user.id) {
      return ResponseHandler.forbidden(res, 'Accès non autorisé à ce rapport');
    }

    return ResponseHandler.success(res, report);
  } catch (error) {
    return ResponseHandler.error(res, error);
  }
});

// Rapport par session ID
router.get('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const report = await reportGenerationService.getSessionReport(sessionId);

    if (!report) {
      return ResponseHandler.notFound(res, 'Rapport non trouvé pour cette session');
    }

    // Vérifier que le rapport appartient au caissier connecté
    if (report.cashier_id !== req.user.id) {
      return ResponseHandler.forbidden(res, 'Accès non autorisé à ce rapport');
    }

    return ResponseHandler.success(res, report);
  } catch (error) {
    return ResponseHandler.error(res, error);
  }
});

// Statistiques des rapports
router.get('/stats', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const cashier_id = req.user.id;

    const stats = await SessionReport.getReportStats(cashier_id, parseInt(days));

    return ResponseHandler.success(res, stats);
  } catch (error) {
    return ResponseHandler.error(res, error);
  }
});

// Export d'un rapport (simplifié)
router.get('/:reportId/export', async (req, res) => {
  try {
    const { reportId } = req.params;
    const { format = 'json' } = req.query;

    const report = await SessionReport.findById(reportId);

    if (!report) {
      return ResponseHandler.notFound(res, 'Rapport non trouvé');
    }

    // Vérifier que le rapport appartient au caissier connecté
    if (report.cashier_id !== req.user.id) {
      return ResponseHandler.forbidden(res, 'Accès non autorisé à ce rapport');
    }

    if (format === 'json') {
      res.setHeader('Content-Disposition', `attachment; filename="rapport-${reportId}.json"`);
      res.setHeader('Content-Type', 'application/json');
      return res.json(report);
    }

    // Pour PDF/CSV, retourner les données brutes pour l'instant
    // TODO: Implémenter la génération PDF/CSV
    return ResponseHandler.success(res, {
      message: `Export ${format} non encore implémenté`,
      data: report,
    });
  } catch (error) {
    return ResponseHandler.error(res, error);
  }
});

module.exports = router;
