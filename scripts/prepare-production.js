// scripts/prepare-production.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Chemins
const rootDir = path.resolve(__dirname, '..');
const appServeDir = path.join(rootDir, 'AppServe');
const appToolsDir = path.join(rootDir, 'AppTools');
const scriptsDir = path.join(rootDir, 'scripts');

// S'assurer que le dossier scripts existe
if (!fs.existsSync(scriptsDir)) {
  fs.mkdirSync(scriptsDir);
}

console.log('Préparation de la production...');

// 1. Vérifier si le fichier .env existe déjà
const envPath = path.join(appServeDir, '.env');
const envSamplePath = path.join(appServeDir, '.env.sample');

if (fs.existsSync(envPath)) {
  console.log('✅ Fichier .env existant trouvé dans AppServe, il sera utilisé pour la production');

  // Lire le contenu du fichier .env pour vérifier qu'il contient NODE_ENV=production
  let envContent = fs.readFileSync(envPath, 'utf8');
  if (!envContent.includes('NODE_ENV=production')) {
    // Ajouter NODE_ENV=production s'il n'existe pas
    envContent += "\n# Mode de l'application\nNODE_ENV=production\n";
    fs.writeFileSync(envPath, envContent);
    console.log('✅ NODE_ENV=production ajouté au fichier .env');
  }
} else if (fs.existsSync(envSamplePath)) {
  // Créer un fichier .env à partir du .env.sample
  console.log('Création du fichier .env à partir du fichier .env.sample...');
  fs.copyFileSync(envSamplePath, envPath);
  console.log('✅ Fichier .env créé à partir du modèle');

  // Vérifier que NODE_ENV=production est présent
  let envContent = fs.readFileSync(envPath, 'utf8');
  if (!envContent.includes('NODE_ENV=production')) {
    envContent += "\n# Mode de l'application\nNODE_ENV=production\n";
    fs.writeFileSync(envPath, envContent);
    console.log('✅ NODE_ENV=production ajouté au fichier .env');
  }
} else {
  // Créer un message d'erreur et demander à l'utilisateur de créer un fichier .env
  console.error(
    '❌ Aucun fichier .env ou .env.sample trouvé. Veuillez créer un fichier .env dans le dossier AppServe.'
  );
  console.error('Vous pouvez utiliser le modèle suivant:');
  console.error(`
# WooCommerce
WC_URL=https://your-site.com
WC_CONSUMER_KEY=your_key_here
WC_CONSUMER_SECRET=your_secret_here

# WordPress
WP_USER=your_username
WP_APP_PASSWORD=your_app_password

# API
API_URL=http://localhost:3000
SYNC_ON_CHANGE=true
PORT=3000

# JWT configuration
JWT_SECRET=generate_a_secure_random_string_here

# Admin par défaut
ADMIN_USERNAME=admin
ADMIN_PASSWORD=secure_password_here

# Mode de l'application
NODE_ENV=production
`);
  process.exit(1);
}

// 2. Vérifier que tous les modules sont bien installés dans AppServe
console.log('Vérification des dépendances de AppServe...');
try {
  // S'assurer que node_modules existe et contient les modules nécessaires
  if (!fs.existsSync(path.join(appServeDir, 'node_modules'))) {
    console.log('Installation des dépendances de AppServe...');
    execSync('npm install', { cwd: appServeDir, stdio: 'inherit' });
  } else {
    console.log('Les modules sont déjà installés dans AppServe');
  }
  console.log('✅ Dépendances AppServe vérifiées');
} catch (error) {
  console.error('⚠️ Erreur lors de la vérification des dépendances de AppServe:', error.message);
}

// 3. Installation de fs-extra pour le script de copie des node_modules
try {
  console.log('Installation de fs-extra dans le dossier scripts...');
  execSync('npm install fs-extra --no-save', { cwd: scriptsDir, stdio: 'inherit' });
  console.log('✅ fs-extra installé avec succès');
} catch (error) {
  console.error("⚠️ Erreur lors de l'installation de fs-extra:", error.message);
}

// 4. Installer dotenv dans AppTools si nécessaire
try {
  console.log('Installation de dotenv dans AppTools...');
  execSync('npm install --save dotenv', { cwd: appToolsDir });
  console.log('✅ dotenv installé avec succès dans AppTools');
} catch (error) {
  console.error("⚠️ Erreur lors de l'installation de dotenv:", error.message);
}

// 5. Création d'un fichier preload.js simple s'il n'existe pas
const preloadPath = path.join(appToolsDir, 'preload.js');
if (!fs.existsSync(preloadPath)) {
  const preloadContent = `
// preload.js
// Ce fichier est exécuté dans le processus de rendu avant le chargement de la page web
window.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded - Preload script executed');
});
`;
  fs.writeFileSync(preloadPath, preloadContent.trim());
  console.log('✅ preload.js créé');
}

// 6. Mise à jour du package.json d'AppTools pour ajouter un script post-build
const packageJsonPath = path.join(appToolsDir, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Ajouter un script postbuild:prod
if (!packageJson.scripts.postbuild) {
  packageJson.scripts.postbuild = 'node ../scripts/copy-node-modules.js';
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  console.log("✅ Script postbuild ajouté au package.json d'AppTools");
}

console.log(
  '✅ Préparation terminée. Vous pouvez maintenant générer la version de production avec "npm run dist".'
);
