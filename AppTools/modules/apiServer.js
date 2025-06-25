// modules/apiServer.js - Version optimisée pour mises à jour légères
const path = require('path');
const fs = require('fs-extra');
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
  const isPackaged = app.isPackaged;

  // ✅ LOGIQUE OPTIMISÉE: Gestion intelligente selon le type de build
  let nodeModulesPath;

  if (isPackaged) {
    const appDataNodeModules = path.join(app.getPath('userData'), 'AppServe', 'node_modules');
    const installationNodeModules = path.join(appServePath, 'node_modules');

    // 🔍 Détecter le type de build
    const updateMarkerPath = path.join(appServePath, '.update-build');
    const fullMarkerPath = path.join(appServePath, '.full-build');

    let buildType = 'unknown';
    if (fs.existsSync(updateMarkerPath)) {
      buildType = 'update';
    } else if (fs.existsSync(fullMarkerPath)) {
      buildType = 'full';
    } else if (fs.existsSync(installationNodeModules)) {
      buildType = 'legacy-full'; // Ancien système sans marqueurs
    }

    console.log(`🏷️ Type de build détecté: ${buildType}`);

    // ✅ STRATÉGIE SELON LE TYPE DE BUILD
    switch (buildType) {
      case 'update':
        console.log('⚡ [UPDATE] Build léger détecté - utilisation AppData obligatoire');

        if (fs.existsSync(appDataNodeModules)) {
          const appDataModules = fs.readdirSync(appDataNodeModules);
          console.log(
            `✅ [UPDATE] node_modules AppData trouvés (${appDataModules.length} modules)`
          );
          nodeModulesPath = appDataNodeModules;
        } else {
          console.error('❌ [UPDATE] ERREUR: node_modules AppData manquants');
          console.error('💡 [UPDATE] SOLUTION: Installer une version FULL en premier');
          console.error(
            '💡 [UPDATE] Les builds UPDATE nécessitent une installation FULL préalable'
          );
          return null;
        }
        break;

      case 'full':
      case 'legacy-full':
        console.log('📦 [FULL] Build complet détecté - gestion hybride');

        // Priorité 1: Utiliser AppData s'il existe (installation existante)
        if (fs.existsSync(appDataNodeModules)) {
          const appDataModules = fs.readdirSync(appDataNodeModules);
          console.log(
            `♻️ [FULL] node_modules AppData existants trouvés (${appDataModules.length} modules)`
          );
          console.log('♻️ [FULL] Réutilisation des modules AppData existants');
          nodeModulesPath = appDataNodeModules;
        }
        // Priorité 2: Première installation - copier depuis le build
        else if (fs.existsSync(installationNodeModules)) {
          console.log('🆕 [FULL-FIRST] Première installation détectée');
          nodeModulesPath = performFirstTimeSetup(app, installationNodeModules, appDataNodeModules);
          if (!nodeModulesPath) return null;
        } else {
          console.error('❌ [FULL] ERREUR: Aucun node_modules trouvé');
          return null;
        }
        break;

      default:
        console.error('❌ [UNKNOWN] Type de build non reconnu');
        console.error('💡 [UNKNOWN] Tentative de détection automatique...');

        // Fallback: logique automatique
        if (fs.existsSync(appDataNodeModules)) {
          console.log('🔄 [FALLBACK] Utilisation AppData par défaut');
          nodeModulesPath = appDataNodeModules;
        } else if (fs.existsSync(installationNodeModules)) {
          console.log('🔄 [FALLBACK] Première installation supposée');
          nodeModulesPath = performFirstTimeSetup(app, installationNodeModules, appDataNodeModules);
          if (!nodeModulesPath) return null;
        } else {
          console.error('❌ [FALLBACK] Aucune solution trouvée');
          return null;
        }
    }
  } else {
    // 🔧 DEV: Utiliser node_modules locaux
    nodeModulesPath = path.join(appServePath, 'node_modules');
    console.log(`🔧 [DEV] node_modules locaux: ${nodeModulesPath}`);
  }

  // ✅ Vérifications de sécurité
  return validateAndStartServer(app, environment, appServePath, nodeModulesPath);
}

// ✅ Fonction dédiée pour la première installation
function performFirstTimeSetup(app, sourceNodeModules, targetNodeModules) {
  console.log('🚀 [FIRST-SETUP] Configuration première installation...');

  const appDataServePath = path.join(app.getPath('userData'), 'AppServe');

  try {
    // Créer le dossier AppData/AppServe
    if (!fs.existsSync(appDataServePath)) {
      fs.mkdirSync(appDataServePath, { recursive: true });
      console.log(`📁 [FIRST-SETUP] Dossier AppData créé: ${appDataServePath}`);
    }

    // Vérifier la source
    const sourceModules = fs.readdirSync(sourceNodeModules);
    console.log(`📦 [FIRST-SETUP] Source contient ${sourceModules.length} modules`);

    if (sourceModules.length === 0) {
      console.error('❌ [FIRST-SETUP] Source vide - build défaillant');
      return null;
    }

    console.log('🔄 [FIRST-SETUP] Copie des node_modules vers AppData...');

    // Copie synchrone avec gestion d'erreur
    fs.copySync(sourceNodeModules, targetNodeModules, {
      dereference: false, // Conserver les liens symboliques
      preserveTimestamps: true,
    });

    // Vérification post-copie
    if (!fs.existsSync(targetNodeModules)) {
      console.error('❌ [FIRST-SETUP] Copie échouée - répertoire non créé');
      return null;
    }

    const copiedModules = fs.readdirSync(targetNodeModules);
    console.log(`✅ [FIRST-SETUP] ${copiedModules.length} modules copiés`);

    // Vérification des modules critiques
    const criticalModules = ['express', 'cors', 'dotenv'];
    const missingCritical = criticalModules.filter(
      (module) => !fs.existsSync(path.join(targetNodeModules, module))
    );

    if (missingCritical.length > 0) {
      console.error(`❌ [FIRST-SETUP] Modules critiques manquants: ${missingCritical.join(', ')}`);
      return null;
    }

    console.log('🎉 [FIRST-SETUP] Configuration réussie');

    // 🗑️ Nettoyage optionnel (économie d'espace)
    try {
      console.log('🧹 [FIRST-SETUP] Suppression node_modules source...');
      fs.removeSync(sourceNodeModules);
      console.log('✅ [FIRST-SETUP] Nettoyage terminé');
    } catch (cleanError) {
      console.warn('⚠️ [FIRST-SETUP] Nettoyage échoué (non critique):', cleanError.message);
    }

    return targetNodeModules;
  } catch (error) {
    console.error('❌ [FIRST-SETUP] Erreur fatale:', error);
    console.error("💡 [FIRST-SETUP] Vérifier les permissions et l'espace disque");
    return null;
  }
}

// ✅ Fonction de validation et démarrage du serveur
function validateAndStartServer(app, environment, appServePath, nodeModulesPath) {
  const criticalModules = ['express', 'dotenv', 'cors'];

  console.log('=== DIAGNOSTIC FINAL ===');
  console.log(`AppServe path: ${appServePath}`);
  console.log(`Node modules path: ${nodeModulesPath}`);
  console.log(`Node modules exists: ${fs.existsSync(nodeModulesPath)}`);

  // Vérification existence
  if (!fs.existsSync(nodeModulesPath)) {
    console.error(`❌ FATAL: Répertoire node_modules introuvable: ${nodeModulesPath}`);
    return null;
  }

  // Vérification modules critiques
  const missingModules = [];
  for (const module of criticalModules) {
    const modulePath = path.join(nodeModulesPath, module);
    const exists = fs.existsSync(modulePath);
    console.log(`Module ${module}: ${exists ? '✅' : '❌'}`);
    if (!exists) missingModules.push(module);
  }

  if (missingModules.length > 0) {
    console.error(`❌ FATAL: Modules manquants: ${missingModules.join(', ')}`);
    console.error('💡 SOLUTION: Réinstaller une version FULL');
    return null;
  }

  // Statistiques
  const moduleCount = fs.readdirSync(nodeModulesPath).length;
  console.log(`📦 Total modules disponibles: ${moduleCount}`);

  // Vérification server.js
  const serverPath = path.join(appServePath, 'server.js');
  if (!fs.existsSync(serverPath)) {
    console.error(`❌ FATAL: Fichier serveur manquant: ${serverPath}`);
    return null;
  }

  // Configuration environnement
  const serverEnv = {
    ...process.env,
    NODE_ENV: environment.isDevMode ? 'development' : 'production',
    ELECTRON_ENV: 'true',
    PORT: process.env.PORT || '3000',
    NODE_PATH: nodeModulesPath,
    WC_URL: process.env.WC_URL,
    WC_CONSUMER_KEY: process.env.WC_CONSUMER_KEY,
    WC_CONSUMER_SECRET: process.env.WC_CONSUMER_SECRET,
  };

  console.log(`🔧 NODE_PATH final: ${serverEnv.NODE_PATH}`);

  // Recherche Node.exe
  const nodePaths = [
    path.join(process.resourcesPath, 'node.exe'),
    path.join(path.dirname(process.execPath), 'node.exe'),
    process.execPath,
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
    console.error('❌ FATAL: Exécutable Node.js introuvable');
    return null;
  }

  // 🚀 Lancement du serveur
  try {
    console.log('=== LANCEMENT SERVEUR API ===');
    console.log(`Commande: "${nodePath}" "${serverPath}"`);
    console.log(`Répertoire de travail: ${appServePath}`);
    console.log(`NODE_PATH: ${serverEnv.NODE_PATH}`);

    const apiProc = spawn(nodePath, [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: serverEnv,
      cwd: appServePath,
      windowsHide: false,
    });

    let hasStarted = false;
    let startupTimeout = setTimeout(() => {
      if (!hasStarted) {
        console.error("⏰ TIMEOUT: Le serveur n'a pas démarré dans les 30 secondes");
        apiProc.kill();
      }
    }, 30000);

    apiProc.on('spawn', () => {
      console.log('✅ Processus API démarré');
      hasStarted = true;
      clearTimeout(startupTimeout);
    });

    apiProc.on('error', (err) => {
      console.error('❌ ERREUR processus API:', err);
      clearTimeout(startupTimeout);
    });

    apiProc.stdout.on('data', (data) => {
      const output = data.toString().trim();
      console.log(`[API] ${output}`);

      if (output.includes('Serveur démarré') || output.includes('Server started')) {
        hasStarted = true;
        clearTimeout(startupTimeout);
      }
    });

    apiProc.stderr.on('data', (data) => {
      const error = data.toString().trim();
      console.error(`[API ERROR] ${error}`);

      if (error.includes('Cannot find module') || error.includes('MODULE_NOT_FOUND')) {
        console.error('❌ ERREUR CRITIQUE: Module Node.js manquant');
        console.error(`💡 NODE_PATH configuré: ${serverEnv.NODE_PATH}`);
        console.error('💡 Essayer de réinstaller une version FULL');
      }
    });

    apiProc.on('close', (code, signal) => {
      clearTimeout(startupTimeout);
      console.log(`[API] Processus fermé - Code: ${code}, Signal: ${signal}`);
    });

    return apiProc;
  } catch (error) {
    console.error('❌ ERREUR FATALE lors du lancement:', error);
    return null;
  }
}

module.exports = { startAPIServer };
