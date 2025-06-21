// scripts/afterPack.js - Version avec préservation des node_modules
const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

exports.default = async function (context) {
  const { appOutDir, packager, electronPlatformName } = context;

  console.log(`AfterPack: Vérification de l'installation pour ${electronPlatformName}`);

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

  // ✅ NOUVEAU : Détecter le type de build
  const markerPath = path.join(appServePath, '.electron-production');
  let isUpdateBuild = false;

  if (fs.existsSync(markerPath)) {
    try {
      const marker = JSON.parse(fs.readFileSync(markerPath, 'utf8'));
      isUpdateBuild = marker.isProduction;
      console.log(
        `📋 Type de build détecté: ${isUpdateBuild ? 'Update (léger)' : 'Major (complet)'}`
      );
    } catch (error) {
      console.log('⚠️ Erreur lecture marqueur, traitement comme build majeur');
    }
  }

  const nodeModulesPath = path.join(appServePath, 'node_modules');
  const installationTargetPath = 'C:\\AppPOS\\resources\\AppServe\\node_modules';

  // ✅ NOUVEAU : Gestion des node_modules selon le type de build
  if (isUpdateBuild) {
    console.log('🔄 [UPDATE BUILD] Gestion des node_modules pour mise à jour légère...');

    // Vérifier si les node_modules existent déjà dans l'installation
    if (fs.existsSync(installationTargetPath)) {
      console.log('✅ [UPDATE] node_modules existants trouvés, conservation');

      // Copier les node_modules existants vers le nouveau build
      try {
        console.log('📦 [UPDATE] Copie des node_modules existants...');
        fs.copySync(installationTargetPath, nodeModulesPath);
        console.log('✅ [UPDATE] node_modules copiés avec succès');
      } catch (error) {
        console.error('❌ [UPDATE] Erreur copie node_modules:', error);
        console.log('🔄 [UPDATE] Installation fraîche des modules...');
        await installNodeModules(appServePath, nodeModulesPath);
      }
    } else {
      console.log('⚠️ [UPDATE] Aucun node_modules existant, installation nécessaire');
      await installNodeModules(appServePath, nodeModulesPath);
    }
  } else {
    console.log('📦 [MAJOR BUILD] Installation complète des node_modules...');

    // Pour les builds majeurs, toujours installer/réinstaller
    if (fs.existsSync(nodeModulesPath)) {
      console.log('🔄 [MAJOR] node_modules déjà présents dans le build');
    } else {
      await installNodeModules(appServePath, nodeModulesPath);
    }
  }

  // Vérifier le fichier .env
  await ensureEnvFile(appServePath);

  console.log('AfterPack: Vérification terminée');
};

// ✅ NOUVEAU : Fonction d'installation des modules
async function installNodeModules(appServePath, nodeModulesPath) {
  // Créer package.json temporaire si nécessaire
  const packageJsonPath = path.join(appServePath, 'package.json');
  let packageJsonCreated = false;

  if (!fs.existsSync(packageJsonPath)) {
    console.log("Création d'un package.json temporaire");
    const tempPackageJson = {
      name: 'appserve',
      version: '1.0.0',
      description: 'API Backend',
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
  }

  // Installer les modules essentiels
  console.log('📦 Installation des modules Node.js...');
  try {
    // Supprimer node_modules si incomplet
    if (fs.existsSync(nodeModulesPath)) {
      const expressPath = path.join(nodeModulesPath, 'express');
      if (!fs.existsSync(expressPath)) {
        console.log('🧹 Module express manquant, nettoyage pour réinstallation...');
        fs.removeSync(nodeModulesPath);
      }
    }

    // Installer les dépendances
    if (!fs.existsSync(nodeModulesPath) || !fs.existsSync(path.join(nodeModulesPath, 'express'))) {
      console.log('⬇️ Installation des modules Node.js...');
      execSync('npm install --production --no-audit', {
        cwd: appServePath,
        stdio: 'inherit',
      });
      console.log('✅ Modules Node.js installés avec succès');
    } else {
      console.log('✅ Modules Node.js déjà présents et complets');
    }
  } catch (error) {
    console.error(`❌ Erreur lors de l'installation des modules: ${error.message}`);
    throw error;
  }

  // Supprimer le package.json temporaire si nous l'avons créé
  if (packageJsonCreated) {
    console.log('🧹 Suppression du package.json temporaire');
    fs.removeSync(packageJsonPath);
  }
}

// ✅ FONCTION EXISTANTE : Assurer l'existence du fichier .env
async function ensureEnvFile(appServePath) {
  const envPath = path.join(appServePath, '.env');
  if (!fs.existsSync(envPath)) {
    console.log(`Le fichier .env est manquant dans ${appServePath}`);

    // Copier depuis .env.sample ou créer un fichier par défaut
    const envSamplePath = path.join(appServePath, '.env.sample');
    if (fs.existsSync(envSamplePath)) {
      console.log(`Copie de .env.sample vers .env`);
      fs.copySync(envSamplePath, envPath);
    } else {
      console.log(`Création d'un fichier .env par défaut`);
      // Créer un fichier .env minimal
      const defaultEnv = `
# API
PORT=3000
# Mode de l'application
NODE_ENV=production
`;
      fs.writeFileSync(envPath, defaultEnv.trim());
    }
    console.log(`✅ Fichier .env créé dans ${appServePath}`);
  } else {
    console.log(`✅ Le fichier .env existe dans ${appServePath}`);
  }
}
