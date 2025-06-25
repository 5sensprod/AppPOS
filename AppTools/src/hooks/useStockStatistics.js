// src/hooks/useStockStatistics.js

import { useState, useEffect } from 'react';
import apiService from '../services/api';

/**
 * Hook personnalisé pour gérer les statistiques de stock
 * @returns {Object} État et fonctions de gestion des statistiques
 */
export const useStockStatistics = () => {
  const [stockStats, setStockStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  /**
   * Récupère les statistiques depuis l'API
   */
  const fetchStockStatistics = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('🔄 Chargement des statistiques de stock...');
      const response = await apiService.get('/api/products/stock/statistics');

      setStockStats(response.data.data);
      setLastUpdate(new Date());
      console.log('✅ Statistiques chargées avec succès');
    } catch (err) {
      const errorMessage = 'Erreur lors du chargement des statistiques';
      setError(errorMessage);
      console.error('❌ Erreur stats:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Actualise les données
   */
  const refreshData = () => {
    fetchStockStatistics();
  };

  // Chargement initial
  useEffect(() => {
    fetchStockStatistics();
  }, []);

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
