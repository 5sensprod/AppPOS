// scripts/copy-node-modules.js
const fs = require('fs-extra');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const appServeDir = path.join(rootDir, 'AppServe');
const releaseDir = path.join(rootDir, 'release');

// Trouver le dossier win-unpacked ou autre selon la plateforme
let targetDir;
if (fs.existsSync(path.join(releaseDir, 'win-unpacked'))) {
  targetDir = path.join(releaseDir, 'win-unpacked');
} else if (fs.existsSync(path.join(releaseDir, 'mac'))) {
  targetDir = path.join(releaseDir, 'mac');
} else if (fs.existsSync(path.join(releaseDir, 'linux-unpacked'))) {
  targetDir = path.join(releaseDir, 'linux-unpacked');
}

if (!targetDir) {
  console.error('Aucun dossier cible trouvé dans le répertoire release');
  process.exit(1);
}

// Chemin vers les node_modules source et destination
const sourceNodeModules = path.join(appServeDir, 'node_modules');
const destNodeModules = path.join(targetDir, 'resources', 'AppServe', 'node_modules');

console.log(`Copie des node_modules de ${sourceNodeModules} vers ${destNodeModules}`);

// S'assurer que le dossier parent existe
fs.ensureDirSync(path.join(targetDir, 'resources', 'AppServe'));

// Copier les node_modules
try {
  fs.copySync(sourceNodeModules, destNodeModules, {
    overwrite: true,
    filter: (src) => {
      // Exclure les fichiers .git, .github, etc.
      const basename = path.basename(src);
      return !basename.startsWith('.');
    },
  });
  console.log('✅ node_modules copiés avec succès');
} catch (err) {
  console.error('❌ Erreur lors de la copie des node_modules:', err);
  process.exit(1);
}

// Vérifier si server.js existe dans le dossier de destination
const serverJsPath = path.join(targetDir, 'resources', 'AppServe', 'server.js');
if (fs.existsSync(serverJsPath)) {
  console.log('✅ server.js existe dans le dossier de destination');
} else {
  console.error("❌ server.js n'existe pas dans le dossier de destination");
  // Copier server.js si nécessaire
  try {
    fs.copySync(path.join(appServeDir, 'server.js'), serverJsPath);
    console.log('✅ server.js copié avec succès');
  } catch (err) {
    console.error('❌ Erreur lors de la copie de server.js:', err);
  }
}

// Vérifier si .env existe dans le dossier de destination
const envPath = path.join(targetDir, 'resources', 'AppServe', '.env');
if (fs.existsSync(envPath)) {
  console.log('✅ .env existe dans le dossier de destination');
} else {
  console.error("❌ .env n'existe pas dans le dossier de destination");
  // Copier .env si nécessaire
  try {
    fs.copySync(path.join(appServeDir, '.env'), envPath);
    console.log('✅ .env copié avec succès');
  } catch (err) {
    console.error('❌ Erreur lors de la copie de .env:', err);
  }
}

console.log('Processus de copie terminé.');
