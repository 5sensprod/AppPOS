// server.js - NETTOYÉ SANS WEBSOCKET POUR AUTH
const express = require('express');
const path = require('path');
const cors = require('cors');
const http = require('http');
require('dotenv').config();
const { getLocalIpAddress } = require('./utils/network');

// Importer les utilitaires
const { setupServerWithHttp } = require('./utils/server-setup');
const { authMiddleware } = require('./utils/auth');
const { getServerStartupId } = require('./utils/auth');
const pathManager = require('./utils/PathManager');

// WebSocket Manager
const websocketManager = require('./websocket/websocketManager');
const { initializeWebSocketEventBridge } = require('./websocket/websocketEventBridge');

// Import du système de sauvegarde
const { performBackup } = require('./backup');
const { performImagesBackup } = require('./backup-images');
const cron = require('node-cron');

// Créer l'application Express
const app = express();

const defaultPort = process.env.PORT || 3000;

// Créer un serveur HTTP pour à la fois Express et WebSocket
const server = http.createServer(app);

// Configuration CORS améliorée
const corsOptions = {
  origin: function (origin, callback) {
    callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

// Initialiser PathManager avant tout
pathManager.initialize();

// ✅ DÉTECTION DE L'ENVIRONNEMENT DE PRODUCTION
function isProductionEnvironment() {
  // Méthode 1: Variable d'environnement
  if (process.env.NODE_ENV === 'production') {
    return true;
  }

  // Méthode 2: Vérification du chemin AppData (utilisation du PathManager)
  if (pathManager.useAppData) {
    console.log('🏭 [BACKUP] Mode production détecté (AppData)');
    return true;
  }

  // Méthode 3: Variable spécifique pour forcer la production
  if (process.env.ENABLE_BACKUP === 'true') {
    console.log('🏭 [BACKUP] Mode production forcé par ENABLE_BACKUP');
    return true;
  }

  console.log('🔧 [BACKUP] Mode développement détecté - Sauvegardes désactivées');
  return false;
}

// ✅ FONCTION D'INITIALISATION SIMPLIFIÉE
async function initializeServer() {
  try {
    console.log('🚀 [SERVER] Initialisation du serveur...');

    const sessionRestoration = require('./services/sessionRestoration');
    await sessionRestoration.restoreActiveSessions();
    console.log('✅ [SERVER] Sessions restaurées');

    await sessionRestoration.cleanupOrphanedSessions(24);
    console.log('✅ [SERVER] Sessions orphelines nettoyées');

    console.log('🎉 [SERVER] Initialisation complète');
  } catch (error) {
    console.error('❌ [SERVER] Erreur initialisation:', error);
  }
}

// Middleware
app.use(cors(corsOptions));
app.use(
  express.json({
    limit: '10mb', // Augmenter de 1mb (défaut) à 10mb
    parameterLimit: 50000, // Augmenter le nombre de paramètres
    extended: true,
  })
);

app.use(
  express.urlencoded({
    limit: '10mb', // Même limite pour les formulaires
    extended: true,
    parameterLimit: 50000,
  })
);

app.use('/public', express.static(pathManager.getPublicPath()));

app.use(
  '/api/products/stock/statistics/export-pdf',
  express.json({
    limit: '15mb', // Limite encore plus élevée pour cette route spécifique
  })
);

// Routes...
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

// Routes API (protégées par authentification)
const categoryRoutes = require('./routes/categoryRoutes');
const productRoutes = require('./routes/productRoutes');
const brandRoutes = require('./routes/brandRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const wooSyncRoutes = require('./routes/wooSyncRoutes');
const productDescriptionRoutes = require('./routes/productDescriptionRoutes');
const productTitleRoutes = require('./routes/productTitleRoutes');
const saleRoutes = require('./routes/saleRoutes');
const timeRoutes = require('./routes/timeRoutes');
const backupRoutes = require('./routes/backupRoutes');

const userPresetRoutes = require('./routes/userPresetRoutes');

const wordpressMenuRoutes = require('./routes/wordpress/menuRoutes');
const userManagementRoutes = require('./routes/userManagementRoutes');
const rolePermissionsRoutes = require('./routes/rolePermissionsRoutes');

// Protection des routes API avec le middleware d'authentification
app.use('/api/categories', authMiddleware, categoryRoutes);
app.use('/api/products', authMiddleware, productRoutes);
app.use('/api/brands', authMiddleware, brandRoutes);
app.use('/api/suppliers', authMiddleware, supplierRoutes);
app.use('/api/sync', authMiddleware, wooSyncRoutes);
app.use('/api/descriptions', authMiddleware, productDescriptionRoutes);
app.use('/api/product-title', authMiddleware, productTitleRoutes);
app.use('/api/sales', authMiddleware, saleRoutes);
app.use('/api/cashier', require('./routes/cashierSessionRoutes'));
app.use('/api/time', timeRoutes);
app.use('/api/backup', authMiddleware, backupRoutes);
app.use('/api/reports', authMiddleware, require('./routes/reportsRoutes'));

app.use('/api/presets', userPresetRoutes);
app.use('/api/wordpress/menu', authMiddleware, wordpressMenuRoutes);

const dataCopyRoutes = require('./routes/dataCopyRoutes');
app.use('/api/data-copy', authMiddleware, dataCopyRoutes);

app.use('/api/users', userManagementRoutes);

app.use('/api/role-permissions', rolePermissionsRoutes);

// ✅ ROUTE D'INFO SERVEUR AVEC ID D'AUTH ET STATUS BACKUP
app.get('/api/server-info', (req, res) => {
  const ipAddress = getLocalIpAddress();
  const port = req.socket.localPort;
  const isProduction = isProductionEnvironment();

  res.json({
    ip: ipAddress,
    port: port,
    url: `http://${ipAddress}:${port}`,
    websocket: `ws://${ipAddress}:${port}/ws`,
    dataPath: pathManager.getDataPath(),
    publicPath: pathManager.getPublicPath(),
    useAppData: pathManager.useAppData,
    mode: pathManager.useAppData ? 'AppData' : 'Local',
    environment: isProduction ? 'production' : 'development',
    backupEnabled: isProduction,
  });
});

// Routes de test et principale (non protégées)
app.get('/test', (req, res) => {
  res.json({ message: 'Le serveur fonctionne correctement !' });
});

app.get('/', (req, res) => {
  res.json({ message: "Bienvenue sur l'API POS" });
});

const labelPrintingRoutes = require('./routes/labelPrintingRoutes');
app.use('/api/label-printing', authMiddleware, labelPrintingRoutes);

// Initialiser WebSocket avec le serveur HTTP
websocketManager.initialize(server);
initializeWebSocketEventBridge();

const lcdRoutes = require('./routes/lcdRoutes');
app.use('/api/lcd', authMiddleware, lcdRoutes);

const posPrinterRoutes = require('./routes/posPrinterRoutes');
app.use('/api/printer', posPrinterRoutes);

// ✅ CONFIGURATION DU CRON UNIQUEMENT EN PRODUCTION
if (isProductionEnvironment()) {
  // Configuration du CRON pour la sauvegarde à 18h quotidiennement
  cron.schedule('30 18 * * *', async () => {
    console.log(`[${new Date().toISOString()}] 🏭 PRODUCTION - Sauvegarde planifiée démarrée...`);
    try {
      await performBackup();
      console.log(`[${new Date().toISOString()}] ✅ Sauvegarde des BDD terminée avec succès`);

      await performImagesBackup();
      console.log(`[${new Date().toISOString()}] ✅ Sauvegarde des images terminée avec succès`);

      console.log(`[${new Date().toISOString()}] 🎉 Sauvegarde complète terminée avec succès`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Erreur de sauvegarde:`, error);
    }
  });

  console.log(
    '🏭 [BACKUP] Sauvegarde automatique configurée pour 18h30 quotidiennement (PRODUCTION)'
  );

  // Option: Sauvegarde au démarrage en production (facultatif)
  if (process.env.BACKUP_ON_STARTUP === 'true') {
    setTimeout(async () => {
      console.log('[STARTUP] Sauvegarde de démarrage en cours...');
      try {
        await performBackup();
        await performImagesBackup();
        console.log('[STARTUP] ✅ Sauvegarde de démarrage terminée');
      } catch (error) {
        console.error('[STARTUP] ❌ Erreur sauvegarde de démarrage:', error);
      }
    }, 30000); // 30 secondes après le démarrage
  }
} else {
  console.log('🔧 [BACKUP] Mode développement - Sauvegardes automatiques désactivées');
  console.log(
    '   ↳ Pour activer les sauvegardes en dev, définir NODE_ENV=production ou ENABLE_BACKUP=true'
  );
}

// ✅ DÉMARRAGE SERVEUR SIMPLIFIÉ
const startServer = async () => {
  try {
    const configuredServer = await setupServerWithHttp(server, app, defaultPort);
    await initializeServer();
    console.log('🎉 [SERVER] Serveur complètement démarré');
    return configuredServer;
  } catch (error) {
    console.error('❌ Erreur démarrage serveur:', error);
    process.exit(1);
  }
};

// Lancer le démarrage
startServer().catch((error) => {
  console.error('❌ Impossible de démarrer le serveur:', error);
  process.exit(1);
});

// ✅ GESTION DE L'ARRÊT PROPRE SIMPLIFIÉE
process.on('SIGINT', () => {
  console.log("Signal d'interruption reçu. Arrêt propre du serveur...");
  shutdownGracefully();
});

process.on('SIGTERM', () => {
  console.log('Signal de terminaison reçu. Arrêt propre du serveur...');
  shutdownGracefully();
});

process.on('exit', () => {
  console.log('Processus en cours de sortie.');
});

function shutdownGracefully() {
  console.log('🛑 [SERVER] Arrêt du serveur...');

  try {
    const cashierSessionService = require('./services/cashierSessionService');
    const activeSessions = Array.from(cashierSessionService.activeSessions.keys());
    if (activeSessions.length > 0) {
      console.log(
        `🔄 [SERVER] Préservation de ${activeSessions.length} session(s) active(s) pour restauration`
      );
    }
  } catch (error) {
    console.error('⚠️ [SERVER] Erreur lors de la préservation des sessions:', error);
  }

  const { shutdownServer } = require('./utils/server-setup');
  shutdownServer();

  if (websocketManager && websocketManager.destroy) {
    websocketManager.destroy();
  }

  server.close(() => {
    console.log('✅ [SERVER] Serveur HTTP fermé proprement.');
  });

  process.exit(0);
}
