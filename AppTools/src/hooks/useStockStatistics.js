// src/hooks/useStockStatistics.js - VERSION SIMPLE API DIRECTE
import { useState, useEffect, useCallback } from 'react';
import apiService from '../services/api';

/**
 * Hook personnalisé pour gérer les statistiques de stock - VERSION SIMPLIFIÉE
 * 🚀 Appel API direct, pas de store intermédiaire
 */
export const useStockStatistics = () => {
  const [stockStats, setStockStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  /**
   * Récupération des statistiques
   */
  const fetchStockStatistics = useCallback(async () => {
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const response = await apiService.get('/api/products/stock/statistics');
      const data = response.data?.success ? response.data.data : response.data;

      setStockStats(data);
      setLastUpdate(new Date());
      setError(null);

      return data;
    } catch (err) {
      console.error('❌ Erreur récupération stats:', err);
      setError(err.message || 'Erreur lors du chargement des statistiques');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loading]);

  /**
   * Alias pour compatibilité
   */
  const refreshData = useCallback(() => {
    return fetchStockStatistics();
  }, [fetchStockStatistics]);

  // 🚀 Chargement automatique au montage
  useEffect(() => {
    if (!stockStats) {
      fetchStockStatistics();
    }
  }, [stockStats, fetchStockStatistics]);

  return {
    // État
    stockStats,
    loading,
    error,
    lastUpdate,

    // Actions
    fetchStockStatistics,
    refreshData,
  };
};

export default useStockStatistics;
