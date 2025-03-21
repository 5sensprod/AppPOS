// src/hooks/useEntityEvents.js
import { useEffect } from 'react';
import websocketService from '../services/websocketService';

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
