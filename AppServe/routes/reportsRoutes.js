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

// Dans AppServe/routes/reportsRoutes.js - REMPLACER la route export par :

// Export d'un rapport (implémentation complète)
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

    const filename = `rapport-${report.cashier_name}-${report.session_date}-${reportId.substring(0, 8)}`;

    if (format === 'json') {
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
      res.setHeader('Content-Type', 'application/json');
      return res.json(report);
    }

    if (format === 'csv') {
      // Générer CSV des mouvements
      const csvHeader = 'Date,Heure,Type,Montant,Raison,Notes,Créé par\n';
      const csvRows = (report.movements || [])
        .map((m) => {
          const date = new Date(m.created_at).toLocaleDateString('fr-FR');
          const time = new Date(m.created_at).toLocaleTimeString('fr-FR');
          const type = m.type === 'in' ? 'Entrée' : 'Sortie';
          const amount = `${m.amount.toFixed(2)}€`;
          const reason = (m.reason || '').replace(/,/g, ';'); // Échapper les virgules
          const notes = (m.notes || '').replace(/,/g, ';');
          const createdBy = m.created_by || '';

          return `${date},${time},${type},${amount},"${reason}","${notes}",${createdBy}`;
        })
        .join('\n');

      const csvContent = csvHeader + csvRows;

      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Length', Buffer.byteLength(csvContent, 'utf8'));

      return res.send('\uFEFF' + csvContent); // BOM pour Excel
    }

    if (format === 'pdf') {
      // Export TXT complet avec quantités de produits et détail des articles
      const pdfContent = `
RAPPORT DE CAISSE DÉTAILLÉ
==========================

INFORMATIONS GÉNÉRALES
======================
Caissier: ${report.cashier_name}
Date de session: ${new Date(report.session_date).toLocaleDateString('fr-FR')}
ID Session: ${report.session_id}
Heure d'ouverture: ${new Date(report.session_start).toLocaleString('fr-FR')}
Heure de fermeture: ${report.session_end ? new Date(report.session_end).toLocaleString('fr-FR') : 'En cours'}
Durée totale: ${report.session_duration || 0} minutes

RÉSUMÉ FINANCIER
================
Fond d'ouverture: ${report.opening_amount.toFixed(2)}€
Fond de fermeture: ${report.closing_amount.toFixed(2)}€
Montant attendu: ${report.expected_amount.toFixed(2)}€
Écart constaté: ${report.variance >= 0 ? '+' : ''}${report.variance.toFixed(2)}€
Méthode de comptage: ${report.counting_method === 'detailed' ? 'Comptage détaillé' : 'Montant global'}
${report.variance_accepted ? 'Écart validé par le caissier' : 'Écart non validé'}

ACTIVITÉ COMMERCIALE
====================
Nombre de ventes: ${report.sales_count}
Chiffre d'affaires total: ${report.total_sales.toFixed(2)}€
${(() => {
  // Calculer la quantité totale de produits vendus depuis les articles détaillés
  const totalQuantity = (report.sales_data || []).reduce((total, sale) => {
    return total + (sale.items || []).reduce((saleTotal, item) => saleTotal + item.quantity, 0);
  }, 0);
  return `Quantité totale de produits vendus: ${totalQuantity}`;
})()}

Répartition par mode de paiement:
- Espèces: ${report.cash_sales.toFixed(2)}€
- Carte bancaire: ${report.card_sales.toFixed(2)}€
- Paiements mixtes: ${report.mixed_sales.toFixed(2)}€

${report.sales_count > 0 ? `Ticket moyen: ${(report.total_sales / report.sales_count).toFixed(2)}€` : ''}

MOUVEMENTS DE CAISSE
===================
Total entrées: +${report.total_movements_in.toFixed(2)}€
Total sorties: -${report.total_movements_out.toFixed(2)}€
Solde net mouvements: ${report.total_movements_in - report.total_movements_out >= 0 ? '+' : ''}${(report.total_movements_in - report.total_movements_out).toFixed(2)}€
Nombre de mouvements: ${report.movements_count}

DÉTAIL DES VENTES
=================
${
  (report.sales_data || []).length === 0
    ? 'Aucune vente enregistrée'
    : (report.sales_data || [])
        .map((sale, index) => {
          const itemsDetail = (sale.items || [])
            .map(
              (item) =>
                `     - ${item.product_name} x${item.quantity} (${item.unit_price.toFixed(2)}€/u = ${item.total_price.toFixed(2)}€)`
            )
            .join('\n');

          const totalItemsCount = (sale.items || []).reduce((sum, item) => sum + item.quantity, 0);

          return `${index + 1}. Transaction: ${sale.transaction_id}
   Heure: ${new Date(sale.created_at).toLocaleString('fr-FR')}
   Montant total: ${sale.total_amount.toFixed(2)}€
   Mode de paiement: ${sale.payment_method === 'cash' ? 'Espèces' : sale.payment_method === 'card' ? 'Carte bancaire' : 'Paiement mixte'}
   Nombre d'articles: ${totalItemsCount}
${itemsDetail ? `   Détail des articles:\n${itemsDetail}` : '   Aucun article détaillé disponible'}`;
        })
        .join('\n\n')
}

DÉTAIL DES MOUVEMENTS DE CAISSE
===============================
${
  (report.movements || []).length === 0
    ? 'Aucun mouvement enregistré'
    : (report.movements || [])
        .map((movement, index) => {
          const date = new Date(movement.created_at).toLocaleString('fr-FR');
          const type = movement.type === 'in' ? 'ENTRÉE' : 'SORTIE';
          const amount = movement.type === 'in' ? '+' : '-';
          return `${index + 1}. ${date}
   Type: ${type}
   Montant: ${amount}${movement.amount.toFixed(2)}€
   Raison: ${movement.reason || 'Non spécifiée'}
   ${movement.notes ? `Notes: ${movement.notes}` : ''}
   Créé par: ${movement.created_by || 'Non spécifié'}`;
        })
        .join('\n\n')
}

${
  report.denominations && Object.keys(report.denominations).length > 0
    ? `
DÉTAIL DU COMPTAGE
==================
${Object.entries(report.denominations)
  .map(([value, count]) => {
    const denomination = parseFloat(value);
    const total = denomination * count;
    const label = denomination >= 1 ? `${denomination}€` : `${(denomination * 100).toFixed(0)}c`;
    return `${label}: ${count} × ${denomination.toFixed(2)}€ = ${total.toFixed(2)}€`;
  })
  .join('\n')}
`
    : ''
}

${
  report.closing_notes
    ? `
NOTES DE FERMETURE
==================
${report.closing_notes}
`
    : ''
}

INFORMATIONS TECHNIQUES
=======================
Rapport généré le: ${new Date(report.generated_at).toLocaleString('fr-FR')}
ID du rapport: ${reportId}
Version du système: POS v1.0

RÉSUMÉ FINAL
============
La session s'est ${
        Math.abs(report.variance) < 0.01
          ? 'parfaitement déroulée sans écart'
          : `terminée avec un écart de ${report.variance.toFixed(2)}€`
      }.
${
  report.sales_count > 0
    ? `${report.sales_count} vente(s) ont été réalisées pour un total de ${report.total_sales.toFixed(2)}€.`
    : "Aucune vente n'a été enregistrée pendant cette session."
}
${
  report.movements_count > 0
    ? `${report.movements_count} mouvement(s) de caisse ont été effectués.`
    : "Aucun mouvement de caisse n'a été effectué."
}

---
Fin du rapport
      `;

      res.setHeader('Content-Disposition', `attachment; filename="${filename}.txt"`);
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');

      return res.send(pdfContent);
    }

    return ResponseHandler.badRequest(res, 'Format non supporté. Utilisez: json, csv, pdf');
  } catch (error) {
    console.error('Erreur export rapport:', error);
    return ResponseHandler.error(res, error);
  }
});

module.exports = router;
