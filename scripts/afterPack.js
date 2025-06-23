// scripts/afterPack.js - ÉTAPE 3 : Skip node_modules pour builds rapides
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

exports.default = async function (context) {
  const { appOutDir, packager, electronPlatformName } = context;

  const skipNodeModules = process.env.SKIP_NODE_MODULES === 'true';

  console.log(`AfterPack: Installation pour ${electronPlatformName}`);
  if (skipNodeModules) {
    console.log('⚡ [SKIP] Mode build rapide - node_modules dans AppData utilisés');
  }

  // Déterminer les chemins en fonction de la plateforme
  let resourcesPath;
  if (electronPlatformName === 'win32') {
    resourcesPath = path.join(appOutDir, 'resources');
  } else if (electronPlatformName === 'darwin') {
    resourcesPath = path.join(
      appOutDir,
      `${packager.appInfo.productName}.app`,
      'Contents',
      'Resources'
    );
  } else {
    resourcesPath = path.join(appOutDir, 'resources');
  }

  const appServePath = path.join(resourcesPath, 'AppServe');
  console.log(`Chemin AppServe: ${appServePath}`);

  // Vérifier si le dossier AppServe existe
  if (!fs.existsSync(appServePath)) {
    console.error(`Erreur: Le dossier AppServe n'existe pas dans ${appServePath}`);
    return;
  }

  // ✅ LOGIQUE OPTIMISÉE selon le mode
  if (skipNodeModules) {
    console.log('⚡ [SKIP] Build rapide activé');
    console.log('📋 [SKIP] node_modules NON empaquetés - utilisation AppData');
    console.log('🎯 [SKIP] Taille installateur réduite de ~80%');

    // Vérifier que les node_modules existent dans AppData
    const appDataNodeModulesPath = path.join(
      os.homedir(),
      'AppData',
      'Roaming',
      'apppos-desktop',
      'AppServe',
      'node_modules'
    );

    if (fs.existsSync(appDataNodeModulesPath)) {
      const moduleCount = fs.readdirSync(appDataNodeModulesPath).length;
      console.log(`✅ [SKIP] ${moduleCount} modules disponibles dans AppData`);
    } else {
      console.warn('⚠️ [SKIP] ATTENTION: Aucun node_modules dans AppData');
      console.warn("💡 [SKIP] L'utilisateur devra faire un build complet d'abord");
    }

    // ✅ NE PAS créer de node_modules dans le build
    console.log('🚀 [SKIP] Installation finale sera 10x plus rapide');
  } else {
    console.log('📦 [FULL] Build complet - installation node_modules dans AppData');

    // ✅ Chemins pour AppData
    const userDataPath = path.join(os.homedir(), 'AppData', 'Roaming', 'apppos-desktop');
    const appDataAppServePath = path.join(userDataPath, 'AppServe');
    const appDataNodeModulesPath = path.join(appDataAppServePath, 'node_modules');

    console.log(`📁 Installation vers AppData: ${appDataAppServePath}`);

    // Créer le dossier AppData/AppServe s'il n'existe pas
    if (!fs.existsSync(appDataAppServePath)) {
      fs.mkdirSync(appDataAppServePath, { recursive: true });
      console.log(`📁 Dossier AppData/AppServe créé`);
    }

    // Copier node_modules vers AppData
    await copyNodeModulesToAppData(appDataNodeModulesPath);
  }

  // Vérifier le fichier .env dans AppServe (code)
  await ensureEnvFile(appServePath);

  console.log('🎉 AfterPack terminé');
};

// ✅ FONCTION : Copier node_modules vers AppData (build complet seulement)
async function copyNodeModulesToAppData(appDataNodeModulesPath) {
  try {
    console.log('📦 [FULL] Copie des node_modules vers AppData...');

    // Supprimer l'ancien dossier s'il existe
    if (fs.existsSync(appDataNodeModulesPath)) {
      console.log('🗑️ [FULL] Suppression ancien node_modules AppData...');
      fs.removeSync(appDataNodeModulesPath);
    }

    // Copier depuis AppServe/node_modules
    const appServeNodeModules = path.resolve('../AppServe/node_modules');
    const rootNodeModules = path.resolve('../../node_modules');

    if (fs.existsSync(appServeNodeModules)) {
      console.log('📦 [FULL] Copie depuis AppServe/node_modules...');
      fs.copySync(appServeNodeModules, appDataNodeModulesPath);
      console.log('✅ [FULL] Modules AppServe copiés vers AppData');
    }

    // Copier les modules hoisted depuis root si nécessaires
    if (fs.existsSync(rootNodeModules)) {
      const hoistedModules = ['express', 'cors', 'multer', 'bonjour', 'uuid'];

      for (const module of hoistedModules) {
        const sourcePath = path.join(rootNodeModules, module);
        const targetPath = path.join(appDataNodeModulesPath, module);

        if (fs.existsSync(sourcePath) && !fs.existsSync(targetPath)) {
          fs.copySync(sourcePath, targetPath);
          console.log(`📦 [FULL] Module hoisted copié: ${module}`);
        }
      }
    }

    const totalModules = countModules(appDataNodeModulesPath);
    console.log(`✅ [FULL] ${totalModules} modules installés dans AppData`);
  } catch (error) {
    console.error('❌ [FULL] Erreur lors de la copie vers AppData:', error);
    throw error;
  }
}

// ✅ Compter les modules
function countModules(nodeModulesPath) {
  if (!fs.existsSync(nodeModulesPath)) return 0;
  return fs.readdirSync(nodeModulesPath).length;
}

// ✅ Fonction pour s'assurer que le fichier .env existe
async function ensureEnvFile(appServePath) {
  const envPath = path.join(appServePath, '.env');

  if (!fs.existsSync(envPath)) {
    console.log('📝 Création du fichier .env par défaut');
    const defaultEnv = `NODE_ENV=production\nELECTRON_ENV=true\nPORT=3000\n`;
    fs.writeFileSync(envPath, defaultEnv);
    console.log('✅ Fichier .env créé');
  } else {
    console.log('✅ Le fichier .env existe');
  }
}
