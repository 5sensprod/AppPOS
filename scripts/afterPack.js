// scripts/afterPack.js - Version backend propre
const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

exports.default = async function (context) {
  const { appOutDir, packager, electronPlatformName } = context;

  const isUpdateBuild = process.env.SKIP_NODE_MODULES === 'true';

  console.log(
    `AfterPack: ${isUpdateBuild ? 'BUILD UPDATE' : 'BUILD FULL'} pour ${electronPlatformName}`
  );

  // Déterminer le chemin selon la plateforme
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

  if (!fs.existsSync(appServePath)) {
    console.error(`❌ ERREUR: Dossier AppServe manquant: ${appServePath}`);
    return;
  }

  if (isUpdateBuild) {
    console.log('⚡ [UPDATE] Configuration build de mise à jour légère...');
    await createUpdateMarker(appServePath);
    await ensureEnvFile(appServePath);
    console.log('🎯 [UPDATE] Build UPDATE terminé');
  } else {
    console.log('📦 [FULL] Configuration build complet...');
    await createFullMarker(appServePath);
    await ensureBackendNodeModules(appServePath);
    await ensureEnvFile(appServePath);
    console.log('🎉 [FULL] Build FULL terminé');
  }
};

// ✅ Installation backend SANS modules natifs problématiques
async function ensureBackendNodeModules(appServePath) {
  const nodeModulesPath = path.join(appServePath, 'node_modules');

  // Créer package.json backend minimal
  const packageJsonPath = path.join(appServePath, 'package.json');
  const backendPackage = {
    name: 'appserve-backend',
    version: '1.0.0',
    main: 'server.js',
    dependencies: {
      express: '^4.21.2',
      cors: '^2.8.5',
      dotenv: '^16.4.7',
      nedb: '^1.8.0',
      'node-cron': '^3.0.3',
      multer: '^1.4.5-lts.1',
      bonjour: '^3.5.0',
      uuid: '^9.0.1',
      'bwip-js': '^4.5.1',
    },
  };

  console.log('📝 [BACKEND] Création package.json backend sans modules natifs...');
  fs.writeFileSync(packageJsonPath, JSON.stringify(backendPackage, null, 2));

  try {
    console.log('⬇️ [BACKEND] Installation modules backend...');
    execSync('npm install --production --no-audit --no-fund --ignore-scripts --no-optional', {
      cwd: appServePath,
      stdio: 'inherit',
      env: {
        ...process.env,
        npm_config_build_from_source: 'false',
        npm_config_optional: 'false',
      },
    });

    const moduleCount = fs.existsSync(nodeModulesPath) ? fs.readdirSync(nodeModulesPath).length : 0;
    console.log(`✅ [BACKEND] Installation réussie (${moduleCount} modules backend)`);

    // Nettoyage final - supprimer tous modules natifs qui auraient pu s'installer
    await cleanNativeModules(nodeModulesPath);
  } catch (error) {
    console.error(`❌ [BACKEND] Erreur installation:`, error.message);
    throw error;
  }
}

// ✅ Nettoyage des modules natifs
async function cleanNativeModules(nodeModulesPath) {
  if (!fs.existsSync(nodeModulesPath)) return;

  const nativeModules = [
    'canvas',
    'fabric',
    '@mapbox',
    'node-gyp',
    'prebuild-install',
    'node-pre-gyp',
    'fsevents',
    'chokidar',
  ];

  let cleaned = 0;
  for (const moduleName of nativeModules) {
    const modulePath = path.join(nodeModulesPath, moduleName);
    if (fs.existsSync(modulePath)) {
      try {
        fs.removeSync(modulePath);
        cleaned++;
        console.log(`🧹 [CLEAN] ${moduleName} supprimé`);
      } catch (error) {
        console.warn(`⚠️ [CLEAN] Impossible de supprimer ${moduleName}`);
      }
    }
  }

  if (cleaned > 0) {
    console.log(`✅ [CLEAN] ${cleaned} modules natifs nettoyés`);
  }
}

// Fonctions utilitaires inchangées
async function createUpdateMarker(appServePath) {
  const markerPath = path.join(appServePath, '.update-build');
  const marker = {
    buildType: 'update',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || 'unknown',
    requiresAppData: true,
    nodeModulesIncluded: false,
  };
  fs.writeFileSync(markerPath, JSON.stringify(marker, null, 2));
  console.log('✅ [UPDATE] Marqueur .update-build créé');
}

async function createFullMarker(appServePath) {
  const markerPath = path.join(appServePath, '.full-build');
  const nodeModulesPath = path.join(appServePath, 'node_modules');
  const marker = {
    buildType: 'full',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || 'unknown',
    requiresAppData: false,
    nodeModulesIncluded: fs.existsSync(nodeModulesPath),
    backendOnly: true,
    nativeModulesExcluded: true,
  };
  fs.writeFileSync(markerPath, JSON.stringify(marker, null, 2));
  console.log('✅ [FULL] Marqueur .full-build créé');
}

async function ensureEnvFile(appServePath) {
  const envPath = path.join(appServePath, '.env');
  if (fs.existsSync(envPath)) {
    console.log('✅ Fichier .env existant');
    return;
  }

  const defaultEnv = `# Configuration API AppPOS
PORT=3000
NODE_ENV=production
WC_URL=
WC_CONSUMER_KEY=
WC_CONSUMER_SECRET=
`;
  fs.writeFileSync(envPath, defaultEnv);
  console.log('✅ .env par défaut créé');
}
