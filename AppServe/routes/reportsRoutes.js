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

router.get('/discount-stats', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const cashier_id = req.user.id;

    console.log('🔍 [DEBUG] Discount Stats Request:');
    console.log('- cashier_id:', cashier_id);
    console.log('- days:', days);

    // 1. Vérifier si des rapports existent pour ce caissier
    console.log('🔍 [DEBUG] Recherche rapports pour caissier...');
    const allReports = await SessionReport.findByCashier(cashier_id, 100);
    console.log('- Nombre de rapports trouvés:', allReports.length);

    if (allReports.length === 0) {
      console.log('❌ [DEBUG] Aucun rapport trouvé pour ce caissier');
      return ResponseHandler.success(res, {
        message: 'Aucun rapport trouvé pour ce caissier',
        cashier_id,
        total_reports: 0,
        suggestion: 'Fermez une session pour générer un rapport',
      });
    }

    // 2. Afficher quelques rapports pour debug
    console.log('📊 [DEBUG] Premiers rapports:');
    allReports.slice(0, 3).forEach((report, index) => {
      console.log(`  Rapport ${index + 1}:`, {
        id: report._id,
        session_date: report.session_date,
        total_sales: report.total_sales,
        total_discounts: report.total_discounts || 0,
      });
    });

    // 3. Vérifier si la méthode getDiscountStats existe
    if (typeof SessionReport.getDiscountStats !== 'function') {
      console.log('❌ [DEBUG] Méthode getDiscountStats non trouvée');
      return ResponseHandler.error(res, new Error('Méthode getDiscountStats non implémentée'));
    }

    // 4. Appeler la méthode
    console.log('🔍 [DEBUG] Appel getDiscountStats...');
    const stats = await SessionReport.getDiscountStats(cashier_id, parseInt(days));
    console.log('✅ [DEBUG] Stats récupérées:', stats);

    return ResponseHandler.success(res, {
      ...stats,
      period_days: parseInt(days),
      cashier_id,
      generated_at: new Date().toISOString(),
      debug_info: {
        total_reports_found: allReports.length,
        method_exists: true,
      },
    });
  } catch (error) {
    console.error('❌ [DEBUG] Erreur stats réductions:', error);
    console.error('❌ [DEBUG] Stack trace:', error.stack);
    return ResponseHandler.error(res, error);
  }
});

// 🛠️ ROUTE DE TEST SIMPLE (à ajouter temporairement)
router.get('/test-reports', async (req, res) => {
  try {
    const cashier_id = req.user.id;

    console.log('🧪 [TEST] Test rapports pour caissier:', cashier_id);

    // Test 1: Compter tous les rapports
    const allReports = await SessionReport.findAll();
    console.log('📊 [TEST] Total rapports système:', allReports.length);

    // Test 2: Rapports pour ce caissier
    const cashierReports = await SessionReport.findByCashier(cashier_id);
    console.log('📊 [TEST] Rapports pour caissier:', cashierReports.length);

    // Test 3: Vérifier les IDs
    const uniqueCashierIds = [...new Set(allReports.map((r) => r.cashier_id))];
    console.log('👥 [TEST] IDs caissiers dans les rapports:', uniqueCashierIds);

    return ResponseHandler.success(res, {
      test_results: {
        total_reports: allReports.length,
        cashier_reports: cashierReports.length,
        current_cashier_id: cashier_id,
        available_cashier_ids: uniqueCashierIds,
        has_reports_for_cashier: cashierReports.length > 0,
      },
      reports_sample: cashierReports.slice(0, 3).map((r) => ({
        id: r._id,
        session_date: r.session_date,
        total_sales: r.total_sales,
        cashier_name: r.cashier_name,
      })),
    });
  } catch (error) {
    console.error('❌ [TEST] Erreur test rapports:', error);
    return ResponseHandler.error(res, error);
  }
});

// 🆕 2. ANALYTICS RÉDUCTIONS DÉTAILLÉES
router.get('/discount-analytics', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const cashier_id = req.user.id;

    // Dates par défaut: 30 derniers jours
    const startDate = start_date
      ? new Date(start_date)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = end_date ? new Date(end_date) : new Date();

    const analytics = await reportGenerationService.getDiscountAnalytics(
      cashier_id,
      startDate,
      endDate
    );

    return ResponseHandler.success(res, {
      ...analytics,
      period: {
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        days: Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)),
      },
      cashier_id,
    });
  } catch (error) {
    console.error('Erreur analytics réductions:', error);
    return ResponseHandler.error(res, error);
  }
});

// 🆕 3. TOP MOTIFS DE RÉDUCTION
router.get('/discount-reasons', async (req, res) => {
  try {
    const { days = 30, limit = 10 } = req.query;
    const cashier_id = req.user.id;

    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - parseInt(days) * 24 * 60 * 60 * 1000);

    const reports = await SessionReport.findByDateRange(startDate, endDate, cashier_id);

    // Agréger tous les motifs
    const reasonsStats = {};
    let totalDiscountAmount = 0;
    let totalUsage = 0;

    reports.forEach((report) => {
      if (report.top_discount_reasons) {
        Object.entries(report.top_discount_reasons).forEach(([reason, amount]) => {
          if (!reasonsStats[reason]) {
            reasonsStats[reason] = {
              reason,
              total_amount: 0,
              usage_count: 0,
              avg_amount: 0,
              percentage_of_total: 0,
            };
          }

          reasonsStats[reason].total_amount += amount;
          reasonsStats[reason].usage_count += 1;
          totalDiscountAmount += amount;
          totalUsage += 1;
        });
      }
    });

    // Calculer les moyennes et pourcentages
    Object.values(reasonsStats).forEach((stats) => {
      stats.avg_amount =
        stats.usage_count > 0
          ? Math.round((stats.total_amount / stats.usage_count) * 100) / 100
          : 0;
      stats.percentage_of_total =
        totalDiscountAmount > 0
          ? Math.round((stats.total_amount / totalDiscountAmount) * 100 * 100) / 100
          : 0;
      stats.total_amount = Math.round(stats.total_amount * 100) / 100;
    });

    // Trier par montant total décroissant
    const topReasons = Object.values(reasonsStats)
      .sort((a, b) => b.total_amount - a.total_amount)
      .slice(0, parseInt(limit));

    return ResponseHandler.success(res, {
      top_reasons: topReasons,
      summary: {
        total_discount_amount: Math.round(totalDiscountAmount * 100) / 100,
        total_usage_count: totalUsage,
        unique_reasons: Object.keys(reasonsStats).length,
        avg_discount_per_usage:
          totalUsage > 0 ? Math.round((totalDiscountAmount / totalUsage) * 100) / 100 : 0,
      },
      period: {
        days: parseInt(days),
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
      },
      cashier_id,
    });
  } catch (error) {
    console.error('Erreur top motifs réductions:', error);
    return ResponseHandler.error(res, error);
  }
});

// 🆕 4. ÉVOLUTION DES RÉDUCTIONS (BONUS)
router.get('/discount-trends', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const cashier_id = req.user.id;

    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - parseInt(days) * 24 * 60 * 60 * 1000);

    const reports = await SessionReport.findByDateRange(startDate, endDate, cashier_id);

    // Grouper par date
    const dailyTrends = {};

    reports.forEach((report) => {
      const date = new Date(report.session_date).toISOString().split('T')[0];

      if (!dailyTrends[date]) {
        dailyTrends[date] = {
          date,
          total_sales: 0,
          total_discounts: 0,
          sales_count: 0,
          sales_with_discounts: 0,
          discount_rate: 0,
          penetration_rate: 0,
        };
      }

      const day = dailyTrends[date];
      day.total_sales += report.total_sales;
      day.total_discounts += report.total_discounts || 0;
      day.sales_count += report.sales_count;
      day.sales_with_discounts += report.sales_with_discounts || 0;
    });

    // Calculer les taux
    Object.values(dailyTrends).forEach((day) => {
      day.discount_rate =
        day.total_sales > 0
          ? Math.round((day.total_discounts / day.total_sales) * 100 * 100) / 100
          : 0;
      day.penetration_rate =
        day.sales_count > 0
          ? Math.round((day.sales_with_discounts / day.sales_count) * 100 * 100) / 100
          : 0;

      day.total_sales = Math.round(day.total_sales * 100) / 100;
      day.total_discounts = Math.round(day.total_discounts * 100) / 100;
    });

    // Trier par date
    const sortedTrends = Object.values(dailyTrends).sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );

    // Calculer les moyennes de période
    const totalSales = sortedTrends.reduce((sum, day) => sum + day.total_sales, 0);
    const totalDiscounts = sortedTrends.reduce((sum, day) => sum + day.total_discounts, 0);
    const avgDiscountRate =
      sortedTrends.length > 0
        ? sortedTrends.reduce((sum, day) => sum + day.discount_rate, 0) / sortedTrends.length
        : 0;

    return ResponseHandler.success(res, {
      daily_trends: sortedTrends,
      period_summary: {
        total_sales: Math.round(totalSales * 100) / 100,
        total_discounts: Math.round(totalDiscounts * 100) / 100,
        avg_discount_rate: Math.round(avgDiscountRate * 100) / 100,
        days_with_data: sortedTrends.length,
      },
      period: {
        days: parseInt(days),
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
      },
      cashier_id,
    });
  } catch (error) {
    console.error('Erreur trends réductions:', error);
    return ResponseHandler.error(res, error);
  }
});

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

module.exports = router;
