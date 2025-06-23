// modules/apiServer.js - Version corrigée avec copySync
const path = require('path');
const fs = require('fs-extra'); // ✅ Assurer qu'on utilise fs-extra
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

  // ✅ Déterminer le chemin des node_modules selon l'environnement
  let nodeModulesPath;
  const isPackaged = app.isPackaged;

  if (isPackaged) {
    // 🏭 PRODUCTION: Utiliser node_modules dans AppData
    nodeModulesPath = path.join(app.getPath('userData'), 'AppServe', 'node_modules');
    console.log(`🏭 [PROD] node_modules depuis AppData: ${nodeModulesPath}`);

    // ✅ CORRIGÉ: Copie première exécution SYNCHRONE
    if (!fs.existsSync(nodeModulesPath)) {
      console.log('🚀 [FIRST RUN] Première exécution - copie node_modules vers AppData...');

      const installationNodeModules = path.join(appServePath, 'node_modules');
      const appDataServePath = path.join(app.getPath('userData'), 'AppServe');

      console.log('🔍 [FIRST RUN] Chemins de copie:');
      console.log(`   Source: ${installationNodeModules}`);
      console.log(`   Destination: ${nodeModulesPath}`);
      console.log(`   AppData parent: ${appDataServePath}`);

      try {
        // Créer le dossier AppData/AppServe s'il n'existe pas
        if (!fs.existsSync(appDataServePath)) {
          fs.mkdirSync(appDataServePath, { recursive: true });
          console.log(`📁 [FIRST RUN] Dossier AppData créé: ${appDataServePath}`);
        } else {
          console.log(`✅ [FIRST RUN] Dossier AppData existe: ${appDataServePath}`);
        }

        // Vérifier que les node_modules source existent et ne sont pas vides
        if (fs.existsSync(installationNodeModules)) {
          const sourceModules = fs.readdirSync(installationNodeModules);
          console.log(`📦 [FIRST RUN] Source contient ${sourceModules.length} modules`);

          if (sourceModules.length > 0) {
            console.log(`🔄 [FIRST RUN] Copie en cours...`);

            // ✅ COPIE SYNCHRONE (pas d'await !)
            fs.copySync(installationNodeModules, nodeModulesPath);

            // Vérifier que la copie a réussi
            if (fs.existsSync(nodeModulesPath)) {
              const copiedModules = fs.readdirSync(nodeModulesPath);
              console.log(`✅ [FIRST RUN] ${copiedModules.length} modules copiés vers AppData`);

              // ✅ Vérifier quelques modules critiques
              const criticalCheck = ['express', 'cors', 'dotenv'];
              let allCriticalPresent = true;

              for (const module of criticalCheck) {
                const modulePath = path.join(nodeModulesPath, module);
                const exists = fs.existsSync(modulePath);
                console.log(`   ${module}: ${exists ? '✅' : '❌'}`);
                if (!exists) allCriticalPresent = false;
              }

              if (allCriticalPresent) {
                console.log('🎉 [FIRST RUN] Copie réussie - modules critiques présents');

                // ✅ OPTIONNEL: Supprimer de l'installation après copie réussie
                console.log("🗑️ [FIRST RUN] Suppression node_modules de l'installation...");
                fs.removeSync(installationNodeModules);
                console.log("✅ [FIRST RUN] node_modules supprimés de l'installation");
              } else {
                console.error('❌ [FIRST RUN] Copie incomplète - modules critiques manquants');
              }
            } else {
              console.error('❌ [FIRST RUN] Échec de la copie - répertoire destination non créé');
            }
          } else {
            console.error(`❌ [FIRST RUN] Source vide: ${installationNodeModules}`);
            return null;
          }
        } else {
          console.error(
            `❌ [FIRST RUN] node_modules source introuvables: ${installationNodeModules}`
          );
          return null;
        }
      } catch (error) {
        console.error('❌ [FIRST RUN] Erreur lors de la copie:', error);
        console.error('Stack:', error.stack);
        return null;
      }
    } else {
      const existingModules = fs.readdirSync(nodeModulesPath);
      console.log(
        `✅ [PROD] node_modules AppData déjà présents (${existingModules.length} modules)`
      );
    }
  } else {
    // 🔧 DEV: Utiliser node_modules locaux
    nodeModulesPath = path.join(appServePath, 'node_modules');
    console.log(`🔧 [DEV] node_modules locaux: ${nodeModulesPath}`);
  }

  const criticalModules = ['express', 'dotenv', 'cors'];

  console.log('=== DIAGNOSTIC COMPLET ===');
  console.log(`AppServe path: ${appServePath}`);
  console.log(`Node modules path: ${nodeModulesPath}`);
  console.log(`Node modules exists: ${fs.existsSync(nodeModulesPath)}`);

  // ✅ Vérifier que le répertoire node_modules existe
  if (!fs.existsSync(nodeModulesPath)) {
    console.error(`❌ ERREUR: Répertoire node_modules introuvable: ${nodeModulesPath}`);

    if (isPackaged) {
      console.error('💡 SOLUTION: Problème de copie première exécution');
      console.error("   Vérifier que l'installation contient node_modules");
    }

    return null;
  }

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

    if (isPackaged) {
      console.error('💡 SOLUTION: node_modules AppData incomplets');
      console.error('   Supprimer C:\\Users\\...\\AppData\\Roaming\\apppos-desktop\\AppServe');
      console.error("   Puis relancer l'application pour recopier");
    }

    return null;
  }

  // ✅ Compter les modules disponibles
  const moduleCount = fs.readdirSync(nodeModulesPath).length;
  console.log(`📦 Modules disponibles: ${moduleCount}`);

  const serverPath = path.join(appServePath, 'server.js');
  if (!fs.existsSync(serverPath)) {
    console.error(`❌ Fichier serveur manquant: ${serverPath}`);
    return null;
  }

  // ✅ Variables d'environnement avec NODE_PATH vers AppData
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

  console.log(`🔧 NODE_PATH configuré: ${serverEnv.NODE_PATH}`);

  // ✅ Recherche Node.exe
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
    console.error('❌ ERREUR: Node.js introuvable!');
    return null;
  }

  try {
    console.log('=== LANCEMENT API ===');
    console.log(`Commande: "${nodePath}" "${serverPath}"`);
    console.log(`Répertoire: ${appServePath}`);
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
        console.error("⏰ TIMEOUT: Le serveur API n'a pas démarré dans les temps");
        apiProc.kill();
      }
    }, 30000);

    apiProc.on('spawn', () => {
      console.log('✅ Processus API spawné');
      hasStarted = true;
      clearTimeout(startupTimeout);
    });

    apiProc.on('error', (err) => {
      console.error(`❌ ERREUR processus API:`, err);
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
        console.error('❌ ERREUR CRITIQUE: Module manquant détecté');
        console.error(`💡 Vérifier NODE_PATH: ${serverEnv.NODE_PATH}`);
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
