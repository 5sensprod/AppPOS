// AppTools/modules/webCaptureHandler.js

const { ipcMain, BrowserWindow } = require('electron');
const path = require('path');
const { injectProductContentSelector } = require('../src/utils/productContentSelector');

// État global étendu pour stocker les données de produits capturées et les URLs
let capturedProductsState = {
  currentProductIndex: 0,
  products: [],
  // Nouvel objet pour stocker les URLs de destination par produit
  productUrls: {},
};

function setupWebCaptureListener(ipcMainInstance) {
  // Ouvrir une fenêtre WebView pour la capture
  ipcMainInstance.on('open-web-capture-window', (event, url, options = {}) => {
    if (!url) return;
    console.log('Web capture options:', options);

    // 1) Crée la fenêtre qui va naviguer normalement
    const captureWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, '../preload.js'),
        webSecurity: false,
        devTools: true,
      },
    });

    // Pour déboguer
    captureWindow.webContents.openDevTools();

    // 2) Extrait la liste des produits depuis l'URL
    const match = url.match(/#APP_PRODUCTS_DATA=([^&]+)/);
    let selectedProducts = [];
    if (match && match[1]) {
      try {
        selectedProducts = JSON.parse(decodeURIComponent(match[1]));
        console.log('Produits analysés correctement :', selectedProducts.length);

        // Initialiser l'état global avec les produits
        capturedProductsState.products = selectedProducts;
        capturedProductsState.currentProductIndex = 0;

        // Initialiser l'objet des URLs si on commence une nouvelle session
        if (options.resetUrls) {
          capturedProductsState.productUrls = {};
        }
      } catch (err) {
        console.error('Erreur parsing produits :', err);
      }
    } else {
      console.warn("Aucune donnée de produit trouvée dans l'URL");
    }

    const wc = captureWindow.webContents;

    // Écouter les changements d'URL pour les stocker
    wc.on('did-navigate', (event, url) => {
      const productId = getProductId(capturedProductsState.currentProductIndex);
      if (productId && url) {
        // Ne pas enregistrer les URLs de départ (google.com)
        if (!url.includes('google.com/#APP_PRODUCTS_DATA=')) {
          console.log(`Stockage de l'URL pour le produit ${productId}:`, url);
          capturedProductsState.productUrls[productId] = url;
        }
      }
    });

    // 3) À CHAQUE chargement complet, on réinjecte l'UI avec l'état en mémoire
    wc.on('did-finish-load', async () => {
      try {
        console.log(
          'Injection du sélecteur de contenu (mode:',
          options.mode || 'content-capture',
          ')'
        );
        await injectProductContentSelector(wc, selectedProducts);

        // Envoyer l'état actuel à la WebView après l'injection
        wc.send('main-to-webview', {
          type: 'SET_CURRENT_PRODUCT',
          payload: {
            currentProductIndex: capturedProductsState.currentProductIndex,
          },
        });

        // Si le produit actuel a des données capturées, les envoyer aussi
        const currentProduct =
          capturedProductsState.products[capturedProductsState.currentProductIndex];
        if (currentProduct && currentProduct._captured) {
          wc.send('main-to-webview', {
            type: 'LOAD_PRODUCT_DATA',
            payload: {
              productIndex: capturedProductsState.currentProductIndex,
              productData: currentProduct._captured,
            },
          });
        }

        // Envoyer les URLs stockées
        wc.send('main-to-webview', {
          type: 'LOAD_PRODUCT_URLS',
          payload: {
            productUrls: capturedProductsState.productUrls,
          },
        });
      } catch (error) {
        console.error("Erreur lors de l'injection du sélecteur :", error);
      }
    });

    // 4) Charge l'URL (la première injection se fera à did-finish-load)
    // Si on navigue vers un produit spécifique et qu'on a déjà une URL stockée pour lui,
    // utiliser cette URL au lieu de l'URL par défaut
    const initialProductId = getProductId(capturedProductsState.currentProductIndex);
    const storedUrl = initialProductId ? capturedProductsState.productUrls[initialProductId] : null;

    captureWindow.loadURL(storedUrl || url);

    // 5) Écouter les événements de fermeture pour nettoyer
    captureWindow.on('closed', () => {
      // Informer l'application principale de la fin de la session de capture
      event.sender.send('web-capture-closed', {
        capturedProducts: capturedProductsState.products,
        productUrls: capturedProductsState.productUrls,
      });
    });
  });

  // Fonction utilitaire pour obtenir l'ID du produit à partir de l'index
  function getProductId(index) {
    if (!capturedProductsState.products[index]) return null;
    const product = capturedProductsState.products[index];
    return product.id || product._id;
  }

  // Écouter les messages du sélecteur de contenu
  ipcMainInstance.on('product-content-selector-message', (event, message) => {
    console.log('Message reçu du sélecteur de contenu:', message);

    // Traiter les différents types de messages
    switch (message.type) {
      case 'REQUEST_STATE':
        // Envoyer l'état actuel
        event.sender.send('main-to-webview', {
          type: 'SET_CURRENT_PRODUCT',
          payload: {
            currentProductIndex: capturedProductsState.currentProductIndex,
          },
        });

        // Envoyer aussi les URLs stockées
        event.sender.send('main-to-webview', {
          type: 'LOAD_PRODUCT_URLS',
          payload: {
            productUrls: capturedProductsState.productUrls,
          },
        });
        break;

      case 'PRODUCT_CHANGED':
        // Mettre à jour l'index du produit actuel
        capturedProductsState.currentProductIndex = message.payload.currentProductIndex;
        break;

      case 'PRODUCT_SAVED':
        // Mettre à jour les données du produit
        if (capturedProductsState.products[message.payload.currentProductIndex]) {
          capturedProductsState.products[message.payload.currentProductIndex]._captured =
            message.payload.productData;
        }

        // Informer l'application principale de la mise à jour
        event.sender.send('captured-product-update', {
          products: capturedProductsState.products,
          currentProductIndex: capturedProductsState.currentProductIndex,
          productUrls: capturedProductsState.productUrls,
        });
        break;

      case 'FIELD_UPDATED':
        // Mettre à jour un champ spécifique
        if (capturedProductsState.products[message.payload.currentProductIndex]) {
          const product = capturedProductsState.products[message.payload.currentProductIndex];
          product._captured = product._captured || {};
          product._captured[message.payload.field] = message.payload.value;
        }
        break;

      case 'NAVIGATION_START':
        // Stocker l'index du produit actuel pour le restaurer après la navigation
        capturedProductsState.currentProductIndex = message.payload.currentProductIndex;
        break;

      case 'URL_SAVED':
        // Stocker l'URL pour un produit spécifique
        if (message.payload.productId && message.payload.url) {
          capturedProductsState.productUrls[message.payload.productId] = message.payload.url;
          console.log(
            `URL stockée pour le produit ${message.payload.productId}:`,
            message.payload.url
          );
        }
        break;

      case 'NAVIGATE_TO_PRODUCT_URL':
        // Récupérer l'URL stockée pour ce produit et demander la navigation
        const productId = getProductId(message.payload.productIndex);
        if (productId && capturedProductsState.productUrls[productId]) {
          event.sender.send('main-to-webview', {
            type: 'NAVIGATE_TO_URL',
            payload: {
              url: capturedProductsState.productUrls[productId],
            },
          });
        } else {
          // Si aucune URL n'est stockée, lancer une recherche standard
          event.sender.send('main-to-webview', {
            type: 'PERFORM_SEARCH',
            payload: {
              productIndex: message.payload.productIndex,
            },
          });
        }
        break;

      case 'EXPORT_PRODUCTS':
        // Relayer la demande d'export à l'application principale
        event.sender.send('export-captured-products', message.payload.products);
        break;
    }
  });

  // Écouter les demandes d'état des produits capturés
  ipcMainInstance.on('request-captured-products-state', (event) => {
    event.reply('captured-product-update', {
      products: capturedProductsState.products,
      currentProductIndex: capturedProductsState.currentProductIndex,
      productUrls: capturedProductsState.productUrls,
    });
  });
}

module.exports = { setupWebCaptureListener };
