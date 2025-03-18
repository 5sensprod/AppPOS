// modules/apiServer.js
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const logger = require('./logger');

// Fonction pour démarrer le serveur API
function startAPIServer(app, environment) {
  console.log(`Chemin d'application: ${app.getAppPath()}`);
  console.log(`Chemin des resources: ${process.resourcesPath}`);
  console.log(`Environnement NODE_ENV: ${process.env.NODE_ENV}`);

  // Ne pas démarrer l'API si elle est gérée en externe
  if (environment.isDevMode && environment.isApiExternallyManaged) {
    console.log('Mode développement: le serveur API est géré en externe');
    return null;
  }

  console.log('Démarrage du serveur API...');
  // Obtenir le chemin vers AppServe selon l'environnement
  const appServePath = environment.getAppServePath(app);
  console.log('Vérification des modules dans:', appServePath);

  // Vérifiez si les modules essentiels existent
  const criticalModules = ['express', 'dotenv', 'cors'];
  for (const module of criticalModules) {
    const modulePath = path.join(appServePath, 'node_modules', module);
    console.log(`Module ${module} existe: ${fs.existsSync(modulePath)}`);
  }

  const serverPath = path.join(appServePath, 'server.js');
  console.log('Chemin du serveur API:', serverPath);

  // Vérifier si le fichier existe
  if (!fs.existsSync(serverPath)) {
    console.error(`Erreur: Le fichier ${serverPath} n'existe pas!`);
    return null;
  }

  // Définir les variables d'environnement pour le serveur
  const serverEnv = {
    ...process.env,
    NODE_ENV: environment.isDevMode ? 'development' : 'production',
    PORT: process.env.PORT || '3000',
    WC_URL: process.env.WC_URL,
    WC_CONSUMER_KEY: process.env.WC_CONSUMER_KEY,
    WC_CONSUMER_SECRET: process.env.WC_CONSUMER_SECRET,
  };

  console.log("Démarrage du serveur API avec les variables d'environnement:", {
    NODE_ENV: serverEnv.NODE_ENV,
    PORT: serverEnv.PORT,
  });

  // Rechercher node.exe dans plusieurs emplacements possibles
  let nodePath = null;
  const possibleNodePaths = [
    path.join(process.resourcesPath, 'node.exe'), // Celui que nous avons ajouté dans extraFiles
    path.join(process.resourcesPath, 'AppServe', 'node_modules', '.bin', 'node.exe'),
    path.join(path.dirname(process.execPath), 'node.exe'),
    'C:\\Program Files\\nodejs\\node.exe',
    'C:\\nvm4w\\nodejs\\node.exe',
    'node', // En dernier recours, essayer node dans le PATH
  ];

  for (const possiblePath of possibleNodePaths) {
    if (possiblePath === 'node' || fs.existsSync(possiblePath)) {
      nodePath = possiblePath;
      console.log(`Node.js trouvé à: ${nodePath}`);
      break;
    }
  }

  if (!nodePath) {
    console.error('ERREUR CRITIQUE: Impossible de trouver node.exe!');
    return null;
  }

  console.log('===== DIAGNOSTIC API SERVER =====');
  console.log(`Node executable path: ${process.execPath}`);
  console.log(`Node.js path utilisé: ${nodePath}`);
  console.log(`Server path: ${serverPath}`);
  console.log(`Working directory: ${appServePath}`);
  console.log(`Node modules exist: ${fs.existsSync(path.join(appServePath, 'node_modules'))}`);

  // Créer un processus pour le serveur API
  let apiProc;
  try {
    apiProc = spawn(nodePath, [serverPath], {
      stdio: 'pipe',
      env: serverEnv,
      cwd: appServePath,
      windowsHide: false, // Pour debugger plus facilement sur Windows
    });

    // Indicateur pour savoir si le processus a démarré correctement
    let hasStarted = false;

    apiProc.on('spawn', () => {
      console.log('✅ Processus API démarré avec succès');
      hasStarted = true;
    });

    apiProc.on('error', (err) => {
      console.error(`❌ ERREUR lors du démarrage du processus API: ${err.message}`);
      console.error(`Détails de l'erreur: ${JSON.stringify(err)}`);
    });

    // Configurer la journalisation API si disponible
    if (logger.setupApiLogging) {
      logger.setupApiLogging(app, apiProc);
    }

    // Gérer les logs standard
    apiProc.stdout.on('data', (data) => {
      console.log(`API: ${data.toString().trim()}`);
    });

    // Gérer les logs d'erreur
    apiProc.stderr.on('data', (data) => {
      console.error(`API Error: ${data.toString().trim()}`);
    });

    // Gérer la fermeture du processus
    apiProc.on('close', (code, signal) => {
      console.log(`Processus API fermé avec code: ${code}, signal: ${signal}`);

      // Si le processus se termine rapidement, c'est probablement une erreur
      if (!hasStarted || code !== 0) {
        console.error(`⚠️ Le processus API s'est terminé anormalement. Code: ${code}`);
      }
    });

    return apiProc;
  } catch (error) {
    console.error(`Erreur fatale lors du démarrage du serveur API: ${error.message}`);
    return null;
  }
}

module.exports = {
  startAPIServer,
};
