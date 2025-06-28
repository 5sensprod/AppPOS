import { useState, useEffect, useCallback } from 'react';
import apiService from '../services/api';
import websocketService from '../services/websocketService';

/**
 * Hook personnalisé pour gérer les statistiques de stock - VERSION AVEC WEBSOCKETS
 */
export const useStockStatistics = () => {
  const [stockStats, setStockStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  /**
   * Récupération des statistiques via API
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

      console.log('📊 Statistiques de stock récupérées:', data);
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
   * Gestionnaire pour les mises à jour via WebSocket
   */
  const handleStockStatisticsUpdate = useCallback((eventData) => {
    console.log('🔄 Mise à jour des statistiques via WebSocket:', eventData);

    if (eventData && eventData.data) {
      setStockStats(eventData.data);
      setLastUpdate(new Date());
      setError(null);
    }
  }, []);

  /**
   * Alias pour compatibilité
   */
  const refreshData = useCallback(() => {
    return fetchStockStatistics();
  }, [fetchStockStatistics]);

  // 🚀 Configuration WebSocket et chargement initial
  useEffect(() => {
    // Chargement initial
    if (!stockStats && !loading) {
      fetchStockStatistics();
    }

    // Configuration WebSocket
    const handleConnect = () => {
      console.log('🔌 WebSocket connecté - Abonnement aux statistiques de stock');
      // Pas besoin de s'abonner à un type d'entité spécifique pour cet événement
    };

    const handleDisconnect = () => {
      console.log('❌ WebSocket déconnecté');
    };

    // Écouter les événements WebSocket
    websocketService.on('connect', handleConnect);
    websocketService.on('disconnect', handleDisconnect);
    websocketService.on('stock.statistics.changed', handleStockStatisticsUpdate);

    // Nettoyage
    return () => {
      websocketService.off('connect', handleConnect);
      websocketService.off('disconnect', handleDisconnect);
      websocketService.off('stock.statistics.changed', handleStockStatisticsUpdate);
    };
  }, [stockStats, loading, fetchStockStatistics, handleStockStatisticsUpdate]);

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
