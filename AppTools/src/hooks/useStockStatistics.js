// src/hooks/useStockStatistics.js - VERSION MIGRÉE AVEC ZUSTAND
import { useEffect } from 'react';
import useReportsStore from '../stores/useReportsStore';

/**
 * Hook personnalisé pour gérer les statistiques de stock - VERSION ZUSTAND
 * 🚀 Compatible à 100% avec l'ancienne version
 *
 * @returns {Object} État et fonctions de gestion des statistiques (API identique)
 */
export const useStockStatistics = () => {
  // 🚀 ZUSTAND : Utilisation du store centralisé
  const { stockStats, loading, errors, lastUpdate, fetchStockStats, isLoading, getLastUpdate } =
    useReportsStore();

  /**
   * Actualise les données - API identique à l'ancienne version
   */
  const refreshData = () => {
    fetchStockStats();
  };

  /**
   * Wrapper pour fetchStockStatistics - compatibilité API
   */
  const fetchStockStatistics = () => {
    return fetchStockStats();
  };

  // 🚀 Chargement automatique au montage (comportement identique)
  useEffect(() => {
    // Charger seulement si pas déjà de données récentes
    if (!stockStats) {
      fetchStockStats();
    }
  }, [stockStats, fetchStockStats]);

  // 🚀 RETOUR : API 100% identique à l'ancienne version
  return {
    // État - noms identiques
    stockStats,
    loading: loading.stockStats || isLoading(), // Compatibilité avec l'ancien loading
    error: errors.stockStats, // Compatibilité avec l'ancien error
    lastUpdate: lastUpdate.stockStats || getLastUpdate(), // Compatibilité avec lastUpdate

    // Actions - noms identiques
    fetchStockStatistics,
    refreshData,
  };
};

// 🔥 EXPORT PAR DÉFAUT (compatibilité)
export default useStockStatistics;
