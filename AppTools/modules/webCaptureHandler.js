// AppTools/modules/webCaptureHandler.js

const { ipcMain, BrowserWindow } = require('electron');
const path = require('path');
const electron = require('electron');
const app = electron.app || (electron.remote ? electron.remote.app : null);
let productSelectorPath;

if (app && app.isPackaged) {
  // En production
  productSelectorPath = path.join(
    process.resourcesPath,
    'AppTools',
    'src',
    'utils',
    'productContentSelector'
  );
} else {
  // En développement
  productSelectorPath = path.join(__dirname, '..', 'src', 'utils', 'productContentSelector');
}

const { injectProductContentSelector } = require(productSelectorPath);

let createHttpClient;
try {
  if (app && app.isPackaged) {
    // En production
    createHttpClient = require(path.join(app.getAppPath(), 'httpClient.js'));
  } else {
    // En développement
    createHttpClient = require(path.join(__dirname, '..', 'httpClient.js'));
  }
} catch (err) {
  console.error('Erreur lors du chargement de httpClient:', err);
  // Définir une version inline en fallback
  createHttpClient = function (baseURL) {
    const http = require('http');
    // Implémentation minimaliste en cas d'erreur...
    // (version simplifiée de l'implémentation complète)
  };
}

// Créer une instance du client
const apiClient = createHttpClient('http://localhost:3000');

// État global étendu pour stocker les données de produits capturées et les URLs
let capturedProductsState = {
  currentProductIndex: 0,
  products: [],
  productUrls: {},
};

let authToken = null;

async function enhanceDescriptionWithAI(productData) {
  try {
    console.log(
      `🧠 Amélioration de la description avec l'IA pour ${productData.name || productData.sku}`
    );

    // Préparer les headers avec le token d'authentification
    const headers = {};
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    // Préparer les données pour l'appel IA
    const aiRequestData = {
      name: productData.name || '',
      category: productData.category_info?.primary?.path_string || '',
      brand: productData.brand_ref?.name || '',
      price: productData.price || '',
      sku: productData.sku || '',
      currentDescription: productData.description || '',
      message:
        "Améliore cette description de produit pour qu'elle soit plus vendeuse et attrayante. Corrige les fautes et structure le texte.",
    };

    // Appel à l'API de description
    console.log(`[main] Appel au service IA pour améliorer la description`);
    const response = await apiClient.post('/api/descriptions/chat', aiRequestData, headers);

    if (response.data?.success && response.data?.data?.description) {
      console.log(`✅ Description améliorée par l'IA`);
      return response.data.data.description;
    } else {
      console.warn(`⚠️ L'IA n'a pas retourné de description améliorée`);
      return productData.description;
    }
  } catch (err) {
    console.error(`❌ Erreur lors de l'amélioration de la description par IA:`, err.message);
    // En cas d'erreur, on retourne la description originale
    return productData.description;
  }
}

function setupWebCaptureListener(ipcMainInstance) {
  ipcMainInstance.on('set-auth-token', (event, token) => {
    console.log('[main] ← set-auth-token', token ? 'reçu' : 'supprimé');
    authToken = token;
  });

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
        console.log('🗃️ État INITIAL capturé:', JSON.stringify(capturedProductsState, null, 2));
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

  ipcMainInstance.on('update-product-description', async (event, { productId, description }) => {
    console.log('[main] ← update-product-description', productId);
    console.log('[main] Token disponible:', authToken ? 'Oui' : 'Non');

    try {
      // Préparer les headers avec le token d'authentification
      const headers = {};
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      // Notifier que l'amélioration commence
      event.sender.send('description-enhancement-start', { productId });

      // 1. Récupérer les données complètes du produit
      console.log(`[main] Récupération des données du produit ${productId}`);
      const productResponse = await apiClient.get(`/api/products/${productId}`, headers);
      const productData = productResponse.data?.data;

      if (!productData) {
        throw new Error(`Impossible de récupérer les données du produit ${productId}`);
      }

      // 2. Mettre à jour la description brute dans l'objet produit
      productData.description = description;

      // 3. Améliorer la description avec l'IA
      console.log(
        `🧠 Amélioration de la description avec l'IA pour ${productData.name || productData.sku}`
      );
      const enhancedDescription = await enhanceDescriptionWithAI(productData);

      // 4. Mettre à jour le produit avec la description améliorée
      console.log(`[main] Mise à jour de la description améliorée pour ${productId}`);
      await apiClient.put(
        `/api/products/${productId}`,
        { description: enhancedDescription },
        headers
      );
      console.log(`✅ Description mise à jour pour ${productId}`);

      // 5. Mise à jour du state local
      const prod = capturedProductsState.products.find((p) => (p.id || p._id) === productId);
      if (prod) {
        prod._captured = prod._captured || {};
        prod._captured.description = enhancedDescription;
      }

      // 6. Réémission vers la WebView
      event.sender.send('captured-product-update', {
        products: capturedProductsState.products,
        currentProductIndex: capturedProductsState.currentProductIndex,
        productUrls: capturedProductsState.productUrls,
      });

      // 7. Notifier que la description a été améliorée
      event.sender.send('description-enhanced', {
        productId,
        originalDescription: description,
        enhancedDescription: enhancedDescription,
      });
    } catch (err) {
      console.error(`❌ Échec de update-product-description pour ${productId}:`, err.message);

      if (err.response) {
        console.error("Détails de l'erreur:", {
          status: err.response.status,
          data: err.response.data,
        });
      }

      // En cas d'erreur, on essaie quand même de mettre à jour avec la description originale
      try {
        console.log(`[main] Tentative de mise à jour avec la description originale`);
        await apiClient.put(`/api/products/${productId}`, { description }, headers);
        console.log(`✅ Description mise à jour (sans amélioration) pour ${productId}`);

        const prod = capturedProductsState.products.find((p) => (p.id || p._id) === productId);
        if (prod) {
          prod._captured = prod._captured || {};
          prod._captured.description = description;
        }

        event.sender.send('captured-product-update', {
          products: capturedProductsState.products,
          currentProductIndex: capturedProductsState.currentProductIndex,
          productUrls: capturedProductsState.productUrls,
        });

        // Envoyer un événement de fin même en cas d'échec de l'amélioration
        event.sender.send('description-enhanced', {
          productId,
          originalDescription: description,
          enhancedDescription: description,
        });
      } catch (backupErr) {
        console.error(`❌ Échec du plan B pour mise à jour de description:`, backupErr);

        // Toujours envoyer un événement de fin, même en cas d'erreur complète
        event.sender.send('description-enhanced', {
          productId,
          originalDescription: description,
          enhancedDescription: description,
          error: true,
        });
      }
    }
  });

  ipcMainInstance.on('update-product-name', async (event, { productId, name }) => {
    console.log('[main] ← update-product-name', productId, name);

    try {
      // Préparer les headers avec le token d'authentification
      const headers = {};
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      // Utiliser le client HTTP
      console.log(`[main] Envoi PUT /api/products/${productId}`);
      const response = await apiClient.put(`/api/products/${productId}`, { name }, headers);

      console.log(`✅ Nom mis à jour pour ${productId}, statut:`, response.status);

      // Mise à jour du state local
      const prod = capturedProductsState.products.find((p) => (p.id || p._id) === productId);
      if (prod) {
        prod._captured = prod._captured || {};
        prod._captured.title = name;
      }

      // Réémission vers la WebView
      event.sender.send('captured-product-update', {
        products: capturedProductsState.products,
        currentProductIndex: capturedProductsState.currentProductIndex,
        productUrls: capturedProductsState.productUrls,
      });
    } catch (err) {
      console.error(`❌ Échec de update-product-name pour ${productId}:`, err.message);

      if (err.response) {
        console.error("Détails de l'erreur:", {
          status: err.response.status,
          data: err.response.data,
        });
      }
    }
  });
  ipcMainInstance.on('update-product-images', async (event, { productId, images }) => {
    console.log('[main] ← update-product-images', productId, images.length);

    try {
      // Modules nécessaires au traitement d'images
      const fs = require('fs');
      const os = require('os');

      // Préparer les headers avec le token d'authentification
      const headers = {};
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      // Récupérer l'état actuel du produit pour vérifier s'il a déjà une image principale
      console.log(`[main] Récupération de l'état actuel du produit ${productId}`);
      const productResponse = await apiClient.get(`/api/products/${productId}`, headers);
      const hasMainImage = !!productResponse.data?.data?.image;
      console.log(`Produit ${productId} a déjà une image principale: ${hasMainImage}`);

      // Première image chargée avec succès (pour définir éventuellement comme principale)
      let firstImageId = null;

      // Traiter chaque image
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        console.log(`Traitement de l'image ${i + 1}/${images.length}: ${img.src}`);

        try {
          // 1. Télécharger l'image avec notre client HTTP
          const response = await new Promise((resolve, reject) => {
            const url = new URL(img.src);
            const httpModule = url.protocol === 'https:' ? require('https') : require('http');

            const req = httpModule.get(img.src, (res) => {
              if (res.statusCode !== 200) {
                reject(new Error(`Erreur HTTP ${res.statusCode}`));
                return;
              }

              // Déterminer le type MIME
              const contentType = res.headers['content-type'] || 'image/jpeg';

              // Collecter les morceaux de données
              const chunks = [];
              res.on('data', (chunk) => chunks.push(chunk));
              res.on('end', () => {
                const buffer = Buffer.concat(chunks);
                resolve({ data: buffer, headers: { 'content-type': contentType } });
              });
            });

            req.on('error', reject);
            req.end();
          });

          // 2. Déterminer le type MIME et l'extension
          const contentType = response.headers['content-type'] || 'image/jpeg';
          const extension = contentType.split('/')[1] || 'jpg';

          // 3. Sauvegarder temporairement l'image
          const tempDir = os.tmpdir();
          const tempFilePath = path.join(tempDir, `temp-image-${Date.now()}.${extension}`);
          fs.writeFileSync(tempFilePath, response.data);

          // 4. Préparer les données pour l'upload
          // Pour FormData, nous devons créer notre propre implémentation multipart
          const boundary = `----WebKitFormBoundary${Math.random().toString(16).slice(2)}`;
          const fileContent = fs.readFileSync(tempFilePath);

          const formData = [
            `--${boundary}`,
            `Content-Disposition: form-data; name="images"; filename="image.${extension}"`,
            `Content-Type: ${contentType}`,
            '',
            fileContent.toString('binary'),
            `--${boundary}--`,
          ].join('\r\n');

          // 5. Uploader l'image via notre propre requête
          console.log(`[main] Upload de l'image ${i + 1} pour ${productId}`);

          // Requête HTTP directe pour l'upload
          const uploadResponse = await new Promise((resolve, reject) => {
            const url = new URL(`/api/products/${productId}/image`, 'http://localhost:3000');

            const options = {
              hostname: url.hostname,
              port: url.port || 80,
              path: url.pathname,
              method: 'POST',
              headers: {
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
                'Content-Length': Buffer.byteLength(formData, 'binary'),
                ...headers,
              },
            };

            const req = require('http').request(options, (res) => {
              let responseData = '';

              res.on('data', (chunk) => {
                responseData += chunk;
              });

              res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                  try {
                    resolve({
                      data: responseData ? JSON.parse(responseData) : {},
                      status: res.statusCode,
                    });
                  } catch (e) {
                    resolve({
                      data: responseData,
                      status: res.statusCode,
                    });
                  }
                } else {
                  reject({
                    response: {
                      status: res.statusCode,
                      data: responseData ? JSON.parse(responseData) : {},
                    },
                  });
                }
              });
            });

            req.on('error', reject);
            req.write(formData, 'binary');
            req.end();
          });

          // Récupérer l'ID de l'image uploadée
          const imageId = uploadResponse.data?.data?._id;
          console.log(`Image ${i + 1} uploadée avec succès, ID: ${imageId}`);

          // Stocker l'ID de la première image pour définir éventuellement l'image principale
          if (i === 0 && !firstImageId) {
            firstImageId = imageId;
          }

          // 6. Supprimer le fichier temporaire
          fs.unlinkSync(tempFilePath);
        } catch (imgError) {
          console.error(`Erreur lors du traitement de l'image ${i + 1}:`, imgError.message);
        }
      }

      // Si c'est la première image et qu'il n'y a pas d'image principale, la définir comme principale
      if (firstImageId && !hasMainImage) {
        try {
          console.log(`Définition de l'image ${firstImageId} comme image principale`);
          await apiClient.put(
            `/api/products/${productId}/main-image`,
            { imageId: firstImageId },
            headers
          );
        } catch (mainImgError) {
          console.error(
            "Erreur lors de la définition de l'image principale:",
            mainImgError.message
          );
        }
      }

      console.log(`✅ Images mises à jour pour ${productId}`);

      // Notifier la WebView
      event.sender.send('images-updated', { productId, success: true });
    } catch (err) {
      console.error(`❌ Échec de update-product-images pour ${productId}:`, err.message);

      if (err.response) {
        console.error("Détails de l'erreur:", {
          status: err.response.status,
          data: err.response.data,
        });
      }

      event.sender.send('images-updated', { productId, success: false, error: err.message });
    }
  });
}

module.exports = { setupWebCaptureListener };
