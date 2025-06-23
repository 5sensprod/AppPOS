// modules/apiServer.js - Version corrigée
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const logger = require('./logger');

function startAPIServer(app, environment) {
  console.log(`Chemin d'application: ${app.getAppPath()}`);
  console.log(`Chemin des resources: ${process.resourcesPath}`);
  console.log(`Environnement NODE_ENV: ${process.env.NODE_ENV}`);

  if (environment.isDevMode && environment.isApiExternallyManaged) {
    console.log('Mode développement: le serveur API est géré en externe');
    return null;
  }

  console.log('Démarrage du serveur API...');
  const appServePath = environment.getAppServePath(app);

  // ✅ NOUVEAU: Vérification complète des chemins
  const nodeModulesPath = path.join(appServePath, 'node_modules');
  const criticalModules = ['express', 'dotenv', 'cors'];

  console.log('=== DIAGNOSTIC COMPLET ===');
  console.log(`AppServe path: ${appServePath}`);
  console.log(`Node modules path: ${nodeModulesPath}`);
  console.log(`Node modules exists: ${fs.existsSync(nodeModulesPath)}`);

  // Vérifier chaque module critique
  const missingModules = [];
  for (const module of criticalModules) {
    const modulePath = path.join(nodeModulesPath, module);
    const exists = fs.existsSync(modulePath);
    console.log(`Module ${module}: ${exists ? '✅' : '❌'} (${modulePath})`);
    if (!exists) missingModules.push(module);
  }

  if (missingModules.length > 0) {
    console.error(`❌ MODULES MANQUANTS: ${missingModules.join(', ')}`);
    return null;
  }

  const serverPath = path.join(appServePath, 'server.js');
  if (!fs.existsSync(serverPath)) {
    console.error(`❌ Fichier serveur manquant: ${serverPath}`);
    return null;
  }

  // ✅ NOUVEAU: Variables d'environnement améliorées
  const serverEnv = {
    ...process.env,
    NODE_ENV: environment.isDevMode ? 'development' : 'production',
    ELECTRON_ENV: 'true', // Important pour PathManager
    PORT: process.env.PORT || '3000',
    NODE_PATH: nodeModulesPath, // Ajouter le chemin des modules
    WC_URL: process.env.WC_URL,
    WC_CONSUMER_KEY: process.env.WC_CONSUMER_KEY,
    WC_CONSUMER_SECRET: process.env.WC_CONSUMER_SECRET,
  };

  // ✅ AMÉLIORATION: Recherche Node.exe plus robuste
  const nodePaths = [
    path.join(process.resourcesPath, 'node.exe'),
    path.join(path.dirname(process.execPath), 'node.exe'),
    process.execPath, // Utiliser l'exe d'Electron en dernier recours
  ];

  let nodePath = null;
  for (const possiblePath of nodePaths) {
    if (fs.existsSync(possiblePath)) {
      nodePath = possiblePath;
      console.log(`✅ Node.js trouvé: ${nodePath}`);
      break;
    }
  }

  if (!nodePath) {
    console.error('❌ ERREUR: Node.js introuvable!');
    return null;
  }

  try {
    console.log('=== LANCEMENT API ===');
    console.log(`Commande: "${nodePath}" "${serverPath}"`);
    console.log(`Répertoire: ${appServePath}`);

    const apiProc = spawn(nodePath, [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: serverEnv,
      cwd: appServePath,
      windowsHide: false,
    });

    let hasStarted = false;
    let startupTimeout = setTimeout(() => {
      if (!hasStarted) {
        console.error("⏰ TIMEOUT: Le serveur API n'a pas démarré dans les temps");
        apiProc.kill();
      }
    }, 30000); // 30 secondes

    apiProc.on('spawn', () => {
      console.log('✅ Processus API spawné');
      hasStarted = true;
      clearTimeout(startupTimeout);
    });

    apiProc.on('error', (err) => {
      console.error(`❌ ERREUR processus API:`, err);
      clearTimeout(startupTimeout);
    });

    // Logs améliorés
    apiProc.stdout.on('data', (data) => {
      const output = data.toString().trim();
      console.log(`[API] ${output}`);

      // Détecter le démarrage réussi
      if (output.includes('Serveur démarré') || output.includes('Server started')) {
        hasStarted = true;
        clearTimeout(startupTimeout);
      }
    });

    apiProc.stderr.on('data', (data) => {
      const error = data.toString().trim();
      console.error(`[API ERROR] ${error}`);

      // Détecter les erreurs critiques
      if (error.includes('Cannot find module') || error.includes('MODULE_NOT_FOUND')) {
        console.error('❌ ERREUR CRITIQUE: Module manquant détecté');
      }
    });

    apiProc.on('close', (code, signal) => {
      clearTimeout(startupTimeout);
      console.log(`[API] Processus fermé - Code: ${code}, Signal: ${signal}`);
    });

    return apiProc;
  } catch (error) {
    console.error(`❌ ERREUR fatale:`, error);
    return null;
  }
}

module.exports = { startAPIServer };
