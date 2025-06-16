// src/features/pos/components/DrawerIndicator.jsx - VERSION REFACTORISÉE
import React from 'react';
import {
  Wallet,
  AlertTriangle,
  CheckCircle,
  ShoppingBag,
  ArrowUpCircle,
  ArrowDownCircle,
} from 'lucide-react';
import { useDrawer } from '../../../stores/sessionStore';

// ✅ Configuration des statuts (déplacée en dehors du composant)
const STATUS_CONFIG = {
  balanced: {
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-200 dark:border-green-800',
    icon: CheckCircle,
    label: 'Équilibrée',
  },
  sales_normal: {
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
    icon: ShoppingBag,
    label: 'Ventes en cours',
    message: 'Recettes des ventes en espèces',
  },
  sales_high: {
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    borderColor: 'border-orange-200 dark:border-orange-800',
    icon: ShoppingBag,
    label: 'Beaucoup de ventes',
    message: 'Pensez à déposer les espèces',
  },
  warning: {
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
    icon: AlertTriangle,
    label: 'Attention',
    message: 'Petit écart détecté',
  },
  error: {
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-200 dark:border-red-800',
    icon: AlertTriangle,
    label: 'Vérification requise',
    message: 'Écart important détecté',
  },
};

const DrawerIndicator = () => {
  const { drawer, hasOpenDrawer, drawerBalance, expectedBalance, variance } = useDrawer();

  if (!hasOpenDrawer) return null;

  // ✅ Analyser la source de l'écart (simplifié)
  const isFromSales = () => {
    if (!drawer.movements?.length) return false;
    const recentMovements = drawer.movements.slice(0, 3);
    return recentMovements.some(
      (m) => m.reason?.includes('Vente') || m.reason?.includes('Paiement client')
    );
  };

  // ✅ Déterminer le statut (simplifié)
  const getStatus = () => {
    const absVariance = Math.abs(variance);

    if (absVariance < 0.01) return 'balanced';

    if (isFromSales() && variance > 0) {
      return absVariance < 20 ? 'sales_normal' : 'sales_high';
    }

    return absVariance < 5 ? 'warning' : 'error';
  };

  const status = STATUS_CONFIG[getStatus()];
  const StatusIcon = status.icon;
  const VarianceIcon = variance > 0 ? ArrowUpCircle : variance < 0 ? ArrowDownCircle : CheckCircle;

  return (
    <div className={`mb-4 border rounded-lg p-3 ${status.bgColor} ${status.borderColor}`}>
      {/* Header */}
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

      {/* Message contextuel */}
      {status.message && (
        <div className={`mt-2 text-xs ${status.color}`}>
          <StatusIcon className="h-3 w-3 inline mr-1" />
          {status.message}
        </div>
      )}

      {/* Alerte pour écarts critiques */}
      {Math.abs(variance) >= 50 && !isFromSales() && (
        <div className="mt-2 text-xs text-red-700 dark:text-red-300">
          <AlertTriangle className="h-3 w-3 inline mr-1" />
          Écart très important. Vérifiez les mouvements ou effectuez un recomptage.
        </div>
      )}
    </div>
  );
};

export default DrawerIndicator;
