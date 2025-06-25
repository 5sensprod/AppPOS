// scripts/afterPack.js - Version simplifiée avec système de marqueurs
const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

exports.default = async function (context) {
  const { appOutDir, packager, electronPlatformName } = context;

  // ✅ Détecter le type de build
  const isUpdateBuild = process.env.SKIP_NODE_MODULES === 'true';

  console.log(
    `AfterPack: ${isUpdateBuild ? 'BUILD UPDATE' : 'BUILD FULL'} pour ${electronPlatformName}`
  );

  // Déterminer le chemin AppServe selon la plateforme
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

  // Vérification de base
  if (!fs.existsSync(appServePath)) {
    console.error(`❌ ERREUR: Dossier AppServe manquant: ${appServePath}`);
    return;
  }

  if (isUpdateBuild) {
    // 🚀 BUILD UPDATE (léger)
    console.log('⚡ [UPDATE] Configuration build de mise à jour légère...');

    await createUpdateMarker(appServePath);
    await ensureEnvFile(appServePath);

    // Vérification qu'aucun node_modules n'est présent (sécurité)
    const nodeModulesPath = path.join(appServePath, 'node_modules');
    if (fs.existsSync(nodeModulesPath)) {
      console.warn('⚠️ [UPDATE] node_modules détecté dans build UPDATE - suppression...');
      fs.removeSync(nodeModulesPath);
      console.log('✅ [UPDATE] node_modules supprimé (build allégé)');
    }

    console.log('🎯 [UPDATE] Build UPDATE terminé');
    console.log('💡 [UPDATE] Utilisera les node_modules AppData existants');
  } else {
    // 📦 BUILD FULL (complet)
    console.log('📦 [FULL] Configuration build complet...');

    await createFullMarker(appServePath);
    await ensureNodeModules(appServePath);
    await ensureEnvFile(appServePath);

    console.log('🎉 [FULL] Build FULL terminé');
    console.log('💡 [FULL] node_modules seront copiés vers AppData au premier lancement');
  }
};

// ✅ Créer marqueur pour build UPDATE
async function createUpdateMarker(appServePath) {
  const markerPath = path.join(appServePath, '.update-build');
  const marker = {
    buildType: 'update',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || 'unknown',
    requiresAppData: true,
    nodeModulesIncluded: false,
    description: 'Build de mise à jour légère - nécessite node_modules AppData existants',
  };

  try {
    fs.writeFileSync(markerPath, JSON.stringify(marker, null, 2));
    console.log('✅ [UPDATE] Marqueur .update-build créé');
  } catch (error) {
    console.error('❌ [UPDATE] Erreur création marqueur:', error);
  }
}

// ✅ Créer marqueur pour build FULL
async function createFullMarker(appServePath) {
  const markerPath = path.join(appServePath, '.full-build');
  const nodeModulesPath = path.join(appServePath, 'node_modules');

  const marker = {
    buildType: 'full',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || 'unknown',
    requiresAppData: false,
    nodeModulesIncluded: fs.existsSync(nodeModulesPath),
    description: 'Build complet - contient tous les composants nécessaires',
  };

  try {
    fs.writeFileSync(markerPath, JSON.stringify(marker, null, 2));
    console.log('✅ [FULL] Marqueur .full-build créé');
  } catch (error) {
    console.error('❌ [FULL] Erreur création marqueur:', error);
  }
}

// ✅ Assurer la présence des node_modules pour builds FULL
async function ensureNodeModules(appServePath) {
  const nodeModulesPath = path.join(appServePath, 'node_modules');

  if (fs.existsSync(nodeModulesPath)) {
    // Vérifier que les modules sont complets
    const expressPath = path.join(nodeModulesPath, 'express');
    if (fs.existsSync(expressPath)) {
      const moduleCount = fs.readdirSync(nodeModulesPath).length;
      console.log(`✅ [FULL] node_modules existants et complets (${moduleCount} modules)`);
      return;
    } else {
      console.log('🧹 [FULL] node_modules incomplets détectés - nettoyage...');
      fs.removeSync(nodeModulesPath);
    }
  }

  console.log('📦 [FULL] Installation des node_modules...');

  // Créer package.json temporaire
  const packageJsonPath = path.join(appServePath, 'package.json');
  let packageJsonCreated = false;

  if (!fs.existsSync(packageJsonPath)) {
    const tempPackageJson = {
      name: 'appserve',
      version: '1.0.0',
      description: 'API Backend AppPOS',
      main: 'server.js',
      dependencies: {
        express: '^4.18.2',
        cors: '^2.8.5',
        dotenv: '^16.3.1',
        nedb: '^1.8.0',
        'node-cron': '^3.0.0',
        multer: '^1.4.5-lts.1',
        bonjour: '^3.5.0',
        uuid: '^9.0.0',
      },
    };

    fs.writeFileSync(packageJsonPath, JSON.stringify(tempPackageJson, null, 2));
    packageJsonCreated = true;
    console.log('📝 [FULL] package.json temporaire créé');
  }

  try {
    console.log('⬇️ [FULL] npm install en cours...');
    execSync('npm install --production --no-audit --no-fund', {
      cwd: appServePath,
      stdio: 'inherit',
    });

    // Vérification post-installation
    if (fs.existsSync(nodeModulesPath)) {
      const moduleCount = fs.readdirSync(nodeModulesPath).length;
      console.log(`✅ [FULL] Installation réussie (${moduleCount} modules)`);
    } else {
      throw new Error('node_modules non créé après installation');
    }
  } catch (error) {
    console.error(`❌ [FULL] Erreur installation node_modules:`, error.message);
    throw error;
  } finally {
    // Nettoyage package.json temporaire
    if (packageJsonCreated && fs.existsSync(packageJsonPath)) {
      fs.removeSync(packageJsonPath);
      console.log('🧹 [FULL] package.json temporaire supprimé');
    }
  }
}

// ✅ Assurer la présence du fichier .env
async function ensureEnvFile(appServePath) {
  const envPath = path.join(appServePath, '.env');

  if (fs.existsSync(envPath)) {
    console.log('✅ Fichier .env existant');
    return;
  }

  console.log('📝 Création fichier .env...');

  // Essayer de copier .env.sample
  const envSamplePath = path.join(appServePath, '.env.sample');
  if (fs.existsSync(envSamplePath)) {
    fs.copySync(envSamplePath, envPath);
    console.log('✅ .env créé depuis .env.sample');
  } else {
    // Créer .env par défaut
    const defaultEnv = `# Configuration API AppPOS
PORT=3000
NODE_ENV=production

# Variables WooCommerce (à configurer)
WC_URL=
WC_CONSUMER_KEY=
WC_CONSUMER_SECRET=
`;
    fs.writeFileSync(envPath, defaultEnv);
    console.log('✅ .env par défaut créé');
  }
}
