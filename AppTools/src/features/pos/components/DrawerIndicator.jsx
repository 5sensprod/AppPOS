// src/features/pos/components/DrawerIndicator.jsx
import React from 'react';
import { Wallet, AlertTriangle, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { useDrawer } from '../../../stores/sessionStore';

const DrawerIndicator = () => {
  const { drawer, hasOpenDrawer, drawerBalance, expectedBalance, variance } = useDrawer();

  // Ne pas afficher si pas de fond ouvert
  if (!hasOpenDrawer) return null;

  // Déterminer la couleur selon l'écart
  const getVarianceStatus = () => {
    const absVariance = Math.abs(variance);

    if (absVariance < 0.01) {
      return {
        status: 'balanced',
        color: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-50 dark:bg-green-900/20',
        borderColor: 'border-green-200 dark:border-green-800',
        icon: CheckCircle,
        label: 'Équilibrée',
      };
    } else if (absVariance < 5) {
      return {
        status: 'warning',
        color: 'text-yellow-600 dark:text-yellow-400',
        bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
        borderColor: 'border-yellow-200 dark:border-yellow-800',
        icon: AlertTriangle,
        label: 'Attention',
      };
    } else {
      return {
        status: 'error',
        color: 'text-red-600 dark:text-red-400',
        bgColor: 'bg-red-50 dark:bg-red-900/20',
        borderColor: 'border-red-200 dark:border-red-800',
        icon: AlertTriangle,
        label: 'Vérification requise',
      };
    }
  };

  const varianceStatus = getVarianceStatus();
  const Icon = varianceStatus.icon;

  return (
    <div
      className={`mb-4 border rounded-lg p-3 ${varianceStatus.bgColor} ${varianceStatus.borderColor}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`flex items-center space-x-2 ${varianceStatus.color}`}>
            <Wallet className="h-4 w-4" />
            <span className="font-medium text-sm">Fond de caisse</span>
            <Icon className="h-4 w-4" />
          </div>

          <div className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium">{drawerBalance.toFixed(2)}€</span>
            <span className="mx-1">/</span>
            <span>{expectedBalance.toFixed(2)}€</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className={`flex items-center space-x-1 ${varianceStatus.color}`}>
            {variance > 0 ? (
              <TrendingUp className="h-4 w-4" />
            ) : variance < 0 ? (
              <TrendingDown className="h-4 w-4" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            <span className="font-medium text-sm">
              {variance > 0 ? '+' : ''}
              {variance.toFixed(2)}€
            </span>
          </div>

          <span
            className={`text-xs px-2 py-1 rounded-full ${varianceStatus.bgColor} ${varianceStatus.color} border ${varianceStatus.borderColor}`}
          >
            {varianceStatus.label}
          </span>
        </div>
      </div>

      {/* Message détaillé pour écarts importants */}
      {Math.abs(variance) >= 5 && (
        <div className="mt-2 text-xs text-red-700 dark:text-red-300">
          <Icon className="h-3 w-3 inline mr-1" />
          Écart important détecté. Vérifiez les mouvements de caisse ou effectuez un recomptage.
        </div>
      )}
    </div>
  );
};

export default DrawerIndicator;
