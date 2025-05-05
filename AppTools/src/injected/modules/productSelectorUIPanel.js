// AppTools\src\injected\modules\productSelectorUIPanel.js
(() => {
  // Exporter pour le contexte global
  window.ProductSelectorUIPanel = (config) => {
    // Créer le panneau latéral
    function initialize() {
      if (window.__APPTOOLS_PANEL__) return window.__APPTOOLS_PANEL__;

      // Constantes
      const panelWidth = 380;

      // Créer le panneau
      const panel = document.createElement('div');
      panel.id = 'app-tools-panel';

      // Appliquer les styles directement sur l'élément pour éviter qu'ils ne soient désactivés
      Object.assign(panel.style, {
        position: 'fixed',
        top: '0',
        right: '0',
        width: panelWidth + 'px',
        height: '100vh',
        background: '#fff',
        zIndex: '2147483647',
        boxShadow: '-2px 0 6px rgba(0,0,0,.15)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'system-ui, sans-serif',
      });

      // Créer l'en-tête
      const header = document.createElement('header');
      Object.assign(header.style, {
        flex: '0 0 auto',
        padding: '12px 16px',
        fontSize: '15px',
        fontWeight: '600',
        background: '#fafafa',
        borderBottom: '1px solid #e5e5e5',
        display: 'flex',
        justifyContent: 'space-between',
      });

      const headerText = document.createElement('span');
      headerText.textContent = 'AppTools';
      header.appendChild(headerText);

      // Créer le conteneur de contenu
      const content = document.createElement('div');
      content.id = 'form-container';
      Object.assign(content.style, {
        flex: '1 1 auto',
        overflow: 'auto',
        padding: '0',
      });

      // Assembler le panneau
      panel.appendChild(header);
      panel.appendChild(content);
      document.body.appendChild(panel);

      // Décaler la page avec des styles appliqués directement
      const root = document.documentElement;
      root.style.marginRight = panelWidth + 'px';
      root.style.overflowX = root.style.overflowX || 'auto';

      // Nettoyage quand on quitte
      window.addEventListener('unload', () => {
        root.style.marginRight = '';
      });

      // Observateur de mutations pour s'assurer que le panneau reste visible même quand les styles sont désactivés
      const observer = new MutationObserver((mutations) => {
        // S'assurer que le panneau est visible et correctement positionné
        if (panel.style.display !== 'flex') {
          panel.style.display = 'flex';
        }
        if (root.style.marginRight !== panelWidth + 'px') {
          root.style.marginRight = panelWidth + 'px';
        }
      });

      // Observer les changements d'attributs sur le panneau et sur le document
      observer.observe(panel, { attributes: true });
      observer.observe(document.documentElement, { attributes: true });

      window.__APPTOOLS_PANEL__ = panel;
      return panel;
    }

    // Renvoyer le conteneur pour le formulaire
    function getContainer() {
      return document.getElementById('form-container');
    }

    // API publique simplifiée
    return {
      initialize,
      getContainer,
    };
  };
})();
