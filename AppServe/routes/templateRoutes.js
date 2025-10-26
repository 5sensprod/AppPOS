// AppServer/routes/templateRoutes.js
const express = require('express');
const TemplateController = require('../controllers/TemplateController');
const { authMiddleware } = require('../utils/auth');

const router = express.Router();
const controller = new TemplateController();

/**
 * 🎨 ROUTES TEMPLATES
 * Gestion complète des templates de labels
 */

// 📋 GET /api/templates - Liste tous les templates (factory + user + public)
router.get('/', controller.getAllTemplates.bind(controller));

// 📋 GET /api/templates/my - Mes templates uniquement (auth requise)
router.get('/my', authMiddleware, controller.getMyTemplates.bind(controller));

// 📋 GET /api/templates/public - Templates publics uniquement
router.get('/public', controller.getPublicTemplates.bind(controller));

// 📊 GET /api/templates/stats - Statistiques (auth requise)
router.get('/stats', authMiddleware, controller.getStats.bind(controller));

// 🔍 GET /api/templates/:id - Récupérer un template spécifique
router.get('/:id', controller.getTemplate.bind(controller));

// 💾 POST /api/templates - Créer un nouveau template (auth requise)
router.post('/', authMiddleware, controller.saveTemplate.bind(controller));

// ✏️ PUT /api/templates/:id - Mettre à jour un template (auth requise)
router.put('/:id', authMiddleware, controller.updateTemplate.bind(controller));

// 🔄 POST /api/templates/:id/duplicate - Dupliquer un template (auth requise)
router.post('/:id/duplicate', authMiddleware, controller.duplicateTemplate.bind(controller));

// 🗑️ DELETE /api/templates/:id - Supprimer un template (auth requise)
router.delete('/:id', authMiddleware, controller.deleteTemplate.bind(controller));

module.exports = router;
