// src/features/pos/components/DrawerIndicator.jsx - LOGIQUE POS PROFESSIONNELLE
import React from 'react';
import {
  Wallet,
  AlertTriangle,
  CheckCircle,
  ShoppingBag,
  ArrowUpCircle,
  ArrowDownCircle,
  Info,
} from 'lucide-react';
import { useDrawer } from '../../../stores/sessionStore';
import DrawerMovementButton from './DrawerMovementButton';

// ✅ Configuration des statuts avec logique métier
const STATUS_CONFIG = {
  balanced: {
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-200 dark:border-green-800',
    icon: CheckCircle,
    label: 'Équilibrée',
  },
  sales_activity: {
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
    icon: ShoppingBag,
    label: 'Activité normale',
    message: 'Ventes en espèces',
  },
  sales_high: {
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    borderColor: 'border-orange-200 dark:border-orange-800',
    icon: ShoppingBag,
    label: 'Beaucoup de ventes',
    message: 'Pensez à déposer les espèces',
  },
  normal_operations: {
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-50 dark:bg-gray-900/20',
    borderColor: 'border-gray-200 dark:border-gray-800',
    icon: Info,
    label: 'Opérations normales',
    message: 'Mouvements justifiés',
  },
  minor_variance: {
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
    icon: AlertTriangle,
    label: 'Petit écart',
    message: 'Vérification recommandée',
  },
  significant_issue: {
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-200 dark:border-red-800',
    icon: AlertTriangle,
    label: 'Attention requise',
    message: 'Écart important détecté',
  },
  critical_issue: {
    color: 'text-red-700 dark:text-red-300',
    bgColor: 'bg-red-100 dark:bg-red-900/40',
    borderColor: 'border-red-300 dark:border-red-700',
    icon: AlertTriangle,
    label: 'Action immédiate',
    message: 'Recomptage nécessaire',
  },
};

// ✅ Raisons considérées comme "normales" (pas d'alerte)
const NORMAL_REASONS = [
  'Remboursement client',
  'Dépôt en banque',
  'Dépôt de fonds',
  'Appoint en début de journée',
  'Remboursement reçu',
  'Achat urgent', // Peut être normal selon le montant
];

const DrawerIndicator = () => {
  const { drawer, hasOpenDrawer, drawerBalance, expectedBalance, variance } = useDrawer();

  if (!hasOpenDrawer) return null;

  // ✅ Analyser le contexte des mouvements
  const analyzeMovementContext = () => {
    if (!drawer.movements?.length) {
      return { type: 'unknown', isNormal: false, severity: 'low' };
    }

    const recentMovements = drawer.movements.slice(0, 3);

    // Identifier les types de mouvements
    const salesMovements = recentMovements.filter(
      (m) => m.reason?.includes('Vente') || m.reason?.includes('Paiement client')
    );

    const normalOperations = recentMovements.filter((m) =>
      NORMAL_REASONS.some((reason) => m.reason?.includes(reason))
    );

    const unexplainedMovements = recentMovements.filter(
      (m) => !salesMovements.includes(m) && !normalOperations.includes(m)
    );

    // Calculer la sévérité
    const absVariance = Math.abs(variance);
    let severity = 'low';

    if (absVariance > 100) severity = 'critical';
    else if (absVariance > 50) severity = 'high';
    else if (absVariance > 20) severity = 'medium';

    return {
      type:
        salesMovements.length > 0
          ? 'sales'
          : normalOperations.length > 0
            ? 'normal_ops'
            : 'unexplained',
      isNormal: unexplainedMovements.length === 0,
      severity,
      hasNormalOps: normalOperations.length > 0,
      hasSales: salesMovements.length > 0,
    };
  };

  // ✅ Déterminer le statut avec logique métier
  const getStatus = () => {
    const absVariance = Math.abs(variance);

    // Caisse équilibrée
    if (absVariance < 0.01) return 'balanced';

    const context = analyzeMovementContext();

    // Ventes en espèces
    if (context.hasSales && variance > 0) {
      return absVariance < 30 ? 'sales_activity' : 'sales_high';
    }

    // Opérations normales (remboursements, dépôts, etc.)
    if (context.hasNormalOps && context.isNormal) {
      // Pas d'alerte pour les opérations justifiées normales
      if (absVariance < 50) return 'normal_operations';
    }

    // Écarts selon la sévérité
    if (context.severity === 'critical') return 'critical_issue';
    if (context.severity === 'high') return 'significant_issue';
    if (context.severity === 'medium') return 'minor_variance';

    // Petits écarts inexpliqués
    if (absVariance < 10) return 'normal_operations';

    return 'minor_variance';
  };

  const status = STATUS_CONFIG[getStatus()];
  const StatusIcon = status.icon;
  const VarianceIcon = variance > 0 ? ArrowUpCircle : variance < 0 ? ArrowDownCircle : CheckCircle;

  // ✅ Déterminer si on doit afficher une alerte critique
  const showCriticalAlert = () => {
    const context = analyzeMovementContext();
    return Math.abs(variance) >= 100 && !context.isNormal;
  };

  return (
    <div className="mb-4 space-y-3">
      {/* Indicateur principal */}
      <div className={`border rounded-lg p-3 ${status.bgColor} ${status.borderColor}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`flex items-center space-x-2 ${status.color}`}>
              <Wallet className="h-4 w-4" />
              <span className="font-medium text-sm">Fond de caisse</span>
              <StatusIcon className="h-4 w-4" />
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium">{drawerBalance.toFixed(2)}€</span>
              <span className="mx-1">/</span>
              <span>{expectedBalance.toFixed(2)}€</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className={`flex items-center space-x-1 ${status.color}`}>
              <VarianceIcon className="h-4 w-4" />
              <span className="font-medium text-sm">
                {variance > 0 ? '+' : ''}
                {variance.toFixed(2)}€
              </span>
            </div>
            <span
              className={`text-xs px-2 py-1 rounded-full ${status.bgColor} ${status.color} border ${status.borderColor}`}
            >
              {status.label}
            </span>
          </div>
        </div>

        {/* Message contextuel intelligent */}
        {status.message && (
          <div className={`mt-2 text-xs ${status.color}`}>
            <StatusIcon className="h-3 w-3 inline mr-1" />
            {status.message}
          </div>
        )}

        {/* Alerte critique uniquement pour les vrais problèmes */}
        {showCriticalAlert() && (
          <div className="mt-2 text-xs text-red-700 dark:text-red-300">
            <AlertTriangle className="h-3 w-3 inline mr-1" />
            Écart critique inexpliqué. Recomptage immédiat recommandé.
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end">
        <DrawerMovementButton />
      </div>
    </div>
  );
};

export default DrawerIndicator;
