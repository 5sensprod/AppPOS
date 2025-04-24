// AppTools\src\injected\modules\productSelectorInteractionBlocker.js
const ProductSelectorInteractionBlocker = (config) => {
  // Compteurs pour les écouteurs d'événements
  let eventListenersEnabled = false;
  let registeredInterceptors = [];

  // Initialiser le blocage d'interactions
  function initialize() {
    // Abonner aux changements de config
    document.addEventListener('config-changed', (e) => {
      const newConfig = e.detail;
      if (newConfig.behavior.blockExternalInteractions !== undefined) {
        if (newConfig.behavior.blockExternalInteractions) {
          enableInteractionBlocking();
        } else {
          disableInteractionBlocking();
        }
      }
    });

    // Si le blocage est activé dans la config, l'activer immédiatement
    if (config.behavior.blockExternalInteractions) {
      enableInteractionBlocking();
    }
  }

  // Activer le blocage d'interactions
  function enableInteractionBlocking() {
    if (eventListenersEnabled) return;
    eventListenersEnabled = true;

    console.log('Activation du blocage des interactions externes');

    // 1. Blocage des liens
    const linkInterceptor = interceptClicks(config.selectors.interactionBlockers.links);
    registeredInterceptors.push(linkInterceptor);

    // 2. Blocage des boutons
    const buttonInterceptor = interceptClicks(config.selectors.interactionBlockers.buttons);
    registeredInterceptors.push(buttonInterceptor);

    // 3. Blocage des entrées utilisateur
    const inputInterceptor = interceptInputs(config.selectors.interactionBlockers.inputs);
    registeredInterceptors.push(inputInterceptor);

    // 4. Observer les modales et popups
    const modalObserver = handleModals();
    registeredInterceptors.push(modalObserver);

    // 5. Désactiver les iframe qui pourraient interférer
    disableIframes();

    // 6. Prévenir la navigation via URL si configuré
    if (config.behavior.preventUrlNavigation) {
      const hashChangeInterceptor = preventUrlNavigation();
      registeredInterceptors.push(hashChangeInterceptor);
    }
  }

  // Désactiver le blocage d'interactions
  function disableInteractionBlocking() {
    if (!eventListenersEnabled) return;
    eventListenersEnabled = false;

    console.log('Désactivation du blocage des interactions externes');

    // Supprimer tous les intercepteurs enregistrés
    for (const cleanup of registeredInterceptors) {
      if (typeof cleanup === 'function') {
        cleanup();
      }
    }

    registeredInterceptors = [];
  }

  // Intercepter les clics sur des éléments spécifiques
  function interceptClicks(selector) {
    const handler = (e) => {
      const target = e.target.closest(selector);
      if (!target) return;

      // Ne pas bloquer les éléments dans notre interface
      if (target.closest('.' + config.classPrefix + 'product-form')) return;

      console.log('Clic bloqué sur:', target);
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    // Capturer à la phase de capture pour être sûr d'intercepter avant les gestionnaires natifs
    document.addEventListener('click', handler, true);

    // Fonction de nettoyage
    return () => document.removeEventListener('click', handler, true);
  }

  // Intercepter les interactions avec les champs de formulaire
  function interceptInputs(selector) {
    const events = ['focus', 'input', 'change', 'keyup', 'keydown', 'keypress'];
    const handlers = [];

    for (const eventType of events) {
      const handler = (e) => {
        const target = e.target.closest(selector);
        if (!target) return;

        // Ne pas bloquer les éléments dans notre interface
        if (target.closest('.' + config.classPrefix + 'product-form')) return;

        console.log(`Interaction ${eventType} bloquée sur:`, target);
        e.preventDefault();
        e.stopPropagation();
        return false;
      };

      document.addEventListener(eventType, handler, true);
      handlers.push({ type: eventType, handler });
    }

    // Fonction de nettoyage
    return () => {
      for (const { type, handler } of handlers) {
        document.removeEventListener(type, handler, true);
      }
    };
  }

  // Observer et gérer les modales/popups
  function handleModals() {
    // Observer le DOM pour détecter l'apparition de modales
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.addedNodes.length) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Vérifier si c'est une modale
              if (node.matches(config.selectors.interactionBlockers.modals)) {
                console.log('Modale détectée, tentative de fermeture:', node);

                // Essayer de trouver un bouton de fermeture
                const closeButton = node.querySelector(
                  '[aria-label="Close"], .close, .btn-close, .modal-close'
                );
                if (closeButton) {
                  closeButton.click();
                } else {
                  // Si pas de bouton trouvé, masquer la modale
                  node.style.display = 'none';
                  node.style.visibility = 'hidden';
                  node.setAttribute('aria-hidden', 'true');
                }
              }

              // Vérifier les enfants également
              const modals = node.querySelectorAll(config.selectors.interactionBlockers.modals);
              for (const modal of modals) {
                console.log('Modale détectée, tentative de fermeture:', modal);
                modal.style.display = 'none';
                modal.style.visibility = 'hidden';
                modal.setAttribute('aria-hidden', 'true');
              }
            }
          }
        }
      }
    });

    // Observer tout le document
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Fonction de nettoyage
    return () => observer.disconnect();
  }

  // Désactiver les iframes qui pourraient interférer
  function disableIframes() {
    const iframes = document.querySelectorAll(config.selectors.interactionBlockers.iframes);

    for (const iframe of iframes) {
      // Ne pas traiter les iframes de notre propre application
      if (iframe.closest('.' + config.classPrefix + 'product-form')) continue;

      console.log('Iframe désactivée:', iframe);

      // Méthode 1: Masquer l'iframe
      iframe.style.display = 'none';

      // Méthode 2: Remplacer l'iframe par une div statique (optionnel)
      // Ici, nous gardons l'iframe mais la masquons seulement
    }
  }

  // Empêcher la navigation via l'URL (changements de hash, etc.)
  function preventUrlNavigation() {
    const currentUrl = window.location.href;

    const handler = (e) => {
      console.log('Tentative de navigation via URL détectée, annulation');
      e.preventDefault();
      history.replaceState(null, '', currentUrl);
      return false;
    };

    window.addEventListener('hashchange', handler, true);

    // Fonction de nettoyage
    return () => window.removeEventListener('hashchange', handler, true);
  }

  // Bloquer temporairement toutes les interactions (pour les situations exceptionnelles)
  function blockAllInteractions(durationMs = 500) {
    const blocker = document.createElement('div');
    blocker.style.position = 'fixed';
    blocker.style.top = '0';
    blocker.style.left = '0';
    blocker.style.width = '100%';
    blocker.style.height = '100%';
    blocker.style.zIndex = '9999999';
    blocker.style.background = 'transparent';
    blocker.className = config.classPrefix + 'interaction-blocker';

    document.body.appendChild(blocker);

    setTimeout(() => {
      blocker.remove();
    }, durationMs);

    return blocker;
  }

  // API publique
  return {
    initialize,
    enableInteractionBlocking,
    disableInteractionBlocking,
    blockAllInteractions,
    isEnabled: () => eventListenersEnabled,
  };
};

// Export pour le contexte global
window.ProductSelectorInteractionBlocker = ProductSelectorInteractionBlocker;
