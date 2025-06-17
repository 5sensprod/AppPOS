// server.js
const express = require('express');
const path = require('path');
const cors = require('cors');
const http = require('http');
require('dotenv').config();
const { getLocalIpAddress } = require('./utils/network');
// Importer les utilitaires
const { setupServerWithHttp } = require('./utils/server-setup');
const { authMiddleware } = require('./utils/auth');
// WebSocket Manager
const websocketManager = require('./websocket/websocketManager');
const { initializeWebSocketEventBridge } = require('./websocket/websocketEventBridge');
// ✅ NOUVEAU : Import du service de restauration

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

// ✅ NOUVEAU : Fonction d'initialisation du serveur
async function initializeServer() {
  try {
    console.log('🚀 [SERVER] Initialisation du serveur...');
    console.log('✅ [SERVER] WebSocket déjà initialisé');

    // ✅ AJOUTER : Import local dans la fonction
    const sessionRestoration = require('./services/sessionRestoration');

    // 2. ✅ NOUVEAU : Restaurer les sessions actives
    await sessionRestoration.restoreActiveSessions();
    console.log('✅ [SERVER] Sessions restaurées');

    // 3. ✅ NOUVEAU : Nettoyer les sessions orphelines
    await sessionRestoration.cleanupOrphanedSessions(24);
    console.log('✅ [SERVER] Sessions orphelines nettoyées');

    console.log('🎉 [SERVER] Initialisation complète');
  } catch (error) {
    console.error('❌ [SERVER] Erreur initialisation:', error);
  }
}

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
// Fichiers statiques
app.use('/public', express.static(path.resolve(__dirname, 'public')));

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
// Routes de sauvegarde
const backupRoutes = require('./routes/backupRoutes');

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
app.use('/api/cashier', require('./routes/cashierSessionRoutes')); // Ajout des routes de sauvegarde
app.use('/api/backup', authMiddleware, backupRoutes);

// Route d'info serveur
app.get('/api/server-info', (req, res) => {
  const ipAddress = getLocalIpAddress();
  const port = req.socket.localPort;
  res.json({
    ip: ipAddress,
    port: port,
    url: `http://${ipAddress}:${port}`,
    websocket: `ws://${ipAddress}:${port}/ws`,
  });
});

// Routes de test et principale (non protégées)
app.get('/test', (req, res) => {
  res.json({ message: 'Le serveur fonctionne correctement !' });
});

app.get('/', (req, res) => {
  res.json({ message: "Bienvenue sur l'API POS" });
});

// Initialiser WebSocket avec le serveur HTTP
websocketManager.initialize(server);
initializeWebSocketEventBridge();

const lcdRoutes = require('./routes/lcdRoutes');
app.use('/api/lcd', authMiddleware, lcdRoutes);

const posPrinterRoutes = require('./routes/posPrinterRoutes');
app.use('/api/printer', posPrinterRoutes);

// Configuration du CRON pour la sauvegarde à 18h quotidiennement
cron.schedule('30 18 * * *', async () => {
  console.log(`[${new Date().toISOString()}] Sauvegarde planifiée...`);
  try {
    // Sauvegarde des bases de données
    await performBackup();
    console.log(`[${new Date().toISOString()}] Sauvegarde des BDD terminée avec succès`);

    // Sauvegarde des images
    await performImagesBackup();
    console.log(`[${new Date().toISOString()}] Sauvegarde des images terminée avec succès`);

    console.log(`[${new Date().toISOString()}] Sauvegarde complète terminée avec succès`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Erreur de sauvegarde:`, error);
  }
});

console.log('Sauvegarde automatique configurée pour 18h quotidiennement');

// ✅ NOUVEAU : Démarrer le serveur avec restauration
const startServer = async () => {
  try {
    // Démarrer le serveur HTTP/WebSocket
    const configuredServer = await setupServerWithHttp(server, app, defaultPort);

    // ✅ NOUVEAU : Initialiser complètement le serveur (restauration sessions)
    await initializeServer();

    console.log('🎉 [SERVER] Serveur complètement démarré avec restauration');

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

// ✅ MODIFIÉ : Gestion de l'arrêt propre avec préservation des sessions
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

// ✅ MODIFIÉ : Fonction de fermeture avec préservation des sessions
function shutdownGracefully() {
  console.log('🛑 [SERVER] Arrêt du serveur...');

  // ✅ NOUVEAU : Préserver les sessions actives pour restauration
  try {
    const cashierSessionService = require('./services/cashierSessionService');
    const activeSessions = Array.from(cashierSessionService.activeSessions.keys());
    if (activeSessions.length > 0) {
      console.log(
        `🔄 [SERVER] Préservation de ${activeSessions.length} session(s) active(s) pour restauration`
      );
      // Les sessions restent ouvertes en DB pour restauration ultérieure
    }
  } catch (error) {
    console.error('⚠️ [SERVER] Erreur lors de la préservation des sessions:', error);
  }

  const { shutdownServer } = require('./utils/server-setup');
  // Nettoyer les services mDNS
  shutdownServer();
  // Fermer la connexion WebSocket
  if (websocketManager && websocketManager.destroy) {
    websocketManager.destroy();
  }
  // Fermer le serveur HTTP
  server.close(() => {
    console.log('✅ [SERVER] Serveur HTTP fermé proprement.');
  });

  process.exit(0);
}
