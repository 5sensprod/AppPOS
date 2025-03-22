// src/hooks/useEntityEvents.js
import { useEffect } from 'react';
import websocketService from '../services/websocketService';

/**
 * Hook pour gérer les événements WebSocket liés à une entité
 * Fonctionne avec les stores Zustand
 *
 * @param {string} entityType - Type d'entité (ex: 'product', 'supplier', 'category', 'brand')
 * @param {Object} handlers - Gestionnaires d'événements
 * @returns {function} - Fonction de nettoyage pour useEffect
 */
export function useEntityEvents(entityType, handlers = {}) {
  useEffect(() => {
    const cleanupFunctions = [];

    // Standardiser le type d'entité avec gestion spéciale pour category
    let standardEntityType;
    if (entityType === 'category') {
      standardEntityType = 'categories';
    } else {
      standardEntityType = entityType.endsWith('s') ? entityType : `${entityType}s`;
    }

    console.log(`[WS-DEBUG] useEntityEvents: Type d'entité standardisé: ${standardEntityType}`);

    // S'abonner aux événements
    if (handlers.onCreated) {
      websocketService.on(`${standardEntityType}.created`, handlers.onCreated);
      cleanupFunctions.push(() =>
        websocketService.off(`${standardEntityType}.created`, handlers.onCreated)
      );
    }

    if (handlers.onUpdated) {
      console.log(`[WS-DEBUG] Abonnement à ${standardEntityType}.updated`);
      websocketService.on(`${standardEntityType}.updated`, handlers.onUpdated);
      cleanupFunctions.push(() =>
        websocketService.off(`${standardEntityType}.updated`, handlers.onUpdated)
      );
    }

    if (handlers.onDeleted) {
      websocketService.on(`${standardEntityType}.deleted`, handlers.onDeleted);
      cleanupFunctions.push(() =>
        websocketService.off(`${standardEntityType}.deleted`, handlers.onDeleted)
      );
    }

    // S'abonner à des événements spécifiques supplémentaires
    if (handlers.customEvents) {
      Object.entries(handlers.customEvents).forEach(([eventName, handler]) => {
        // Remplacer automatiquement categorys par categories dans les noms d'événements
        const finalEventName = eventName.replace('categorys.', 'categories.');

        websocketService.on(finalEventName, handler);
        cleanupFunctions.push(() => websocketService.off(finalEventName, handler));
      });
    }

    // S'abonner au type d'entité standardisé (important !)
    console.log(`[WS-DEBUG] S'abonnant à ${standardEntityType}`);
    websocketService.subscribe(standardEntityType);

    return () => {
      cleanupFunctions.forEach((cleanup) => cleanup());
    };
  }, [entityType, handlers]);
}

/**
 * Cette fonction peut être utilisée pour initialiser les écouteurs WebSocket
 * dans les composants qui utilisent useEntityStore
 *
 * @param {string} entityType - Type d'entité
 * @param {function} fetchCallback - Fonction de chargement à appeler lors des événements
 * @returns {function} - Fonction de nettoyage pour useEffect
 */
export function initEntityWebSocketListeners(entityType, fetchCallback) {
  // Standardiser le type d'entité
  let standardEntityType;
  if (entityType === 'category') {
    standardEntityType = 'categories';
  } else {
    standardEntityType = entityType.endsWith('s') ? entityType : `${entityType}s`;
  }

  // S'abonner aux événements
  websocketService.subscribe(standardEntityType);

  // Configurer les écouteurs
  const handleEntityEvent = () => {
    console.log(`[WS-DEBUG] Événement reçu pour ${standardEntityType}, rechargement des données`);
    fetchCallback();
  };

  websocketService.on(`${standardEntityType}.created`, handleEntityEvent);
  websocketService.on(`${standardEntityType}.updated`, handleEntityEvent);
  websocketService.on(`${standardEntityType}.deleted`, handleEntityEvent);

  // Retourner une fonction de nettoyage pour useEffect
  return () => {
    websocketService.off(`${standardEntityType}.created`, handleEntityEvent);
    websocketService.off(`${standardEntityType}.updated`, handleEntityEvent);
    websocketService.off(`${standardEntityType}.deleted`, handleEntityEvent);
  };
}
