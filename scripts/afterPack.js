// scripts/afterPack.js
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

  // Vérifier et installer les modules Node.js essentiels
  const nodeModulesPath = path.join(appServePath, 'node_modules');

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
        // Ajoutez ici toutes les dépendances requises par votre API
      },
    };

    fs.writeFileSync(packageJsonPath, JSON.stringify(tempPackageJson, null, 2));
    packageJsonCreated = true;
  }

  // Installer les modules essentiels
  console.log('Installation des modules Node.js essentiels...');
  try {
    // Supprimer node_modules si incomplet
    if (fs.existsSync(nodeModulesPath)) {
      const expressPath = path.join(nodeModulesPath, 'express');
      if (!fs.existsSync(expressPath)) {
        console.log(
          'Module express manquant, suppression de node_modules pour réinstallation complète...'
        );
        fs.removeSync(nodeModulesPath);
      }
    }

    // Installer les dépendances
    if (!fs.existsSync(nodeModulesPath) || !fs.existsSync(path.join(nodeModulesPath, 'express'))) {
      console.log('Installation des modules Node.js...');
      execSync('npm install --production', {
        cwd: appServePath,
        stdio: 'inherit',
      });
      console.log('Modules Node.js installés avec succès');
    } else {
      console.log('Modules Node.js déjà présents');
    }
  } catch (error) {
    console.error(`Erreur lors de l'installation des modules: ${error.message}`);
  }

  // Supprimer le package.json temporaire si nous l'avons créé
  if (packageJsonCreated) {
    console.log('Suppression du package.json temporaire');
    fs.removeSync(packageJsonPath);
  }

  // Vérifier le fichier .env
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
    console.log(`Fichier .env créé dans ${appServePath}`);
  } else {
    console.log(`Le fichier .env existe dans ${appServePath}`);
  }

  console.log('AfterPack: Vérification terminée');
};
