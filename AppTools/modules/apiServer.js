// modules/apiServer.js
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

// Fonction pour démarrer le serveur API
function startAPIServer(app, environment) {
  console.log(`Chemin d'application: ${app.getAppPath()}`);
  console.log(`Chemin des resources: ${process.resourcesPath}`);
  console.log(`Environnement NODE_ENV: ${process.env.NODE_ENV}`);

  // Ne pas démarrer l'API si elle est gérée en externe
  if (environment.isDevMode && environment.isApiExternallyManaged) {
    console.log('Mode développement: le serveur API est géré en externe');
    return null;
  }

  console.log('Démarrage du serveur API...');
  // Obtenir le chemin vers AppServe selon l'environnement
  const appServePath = environment.getAppServePath(app);
  console.log('Vérification des modules dans:', appServePath);

  // Vérifiez si les modules essentiels existent
  const criticalModules = ['express', 'dotenv', 'cors'];
  for (const module of criticalModules) {
    const modulePath = path.join(appServePath, 'node_modules', module);
    console.log(`Module ${module} existe: ${fs.existsSync(modulePath)}`);
  }

  const serverPath = path.join(appServePath, 'server.js');

  console.log('Chemin du serveur API:', serverPath);
  // Vérifier si le fichier existe
  if (!fs.existsSync(serverPath)) {
    console.error(`Erreur: Le fichier ${serverPath} n'existe pas!`);
    return null;
  }

  // Définir les variables d'environnement pour le serveur
  const serverEnv = {
    ...process.env,
    NODE_ENV: environment.isDevMode ? 'development' : 'production',
    PORT: process.env.PORT || '3000',
    WC_URL: process.env.WC_URL,
    WC_CONSUMER_KEY: process.env.WC_CONSUMER_KEY,
    WC_CONSUMER_SECRET: process.env.WC_CONSUMER_SECRET,
  };

  console.log("Démarrage du serveur API avec les variables d'environnement:", {
    NODE_ENV: serverEnv.NODE_ENV,
    PORT: serverEnv.PORT,
  });

  // Lancer le processus du serveur API
  const apiProc = spawn('node', [serverPath], {
    stdio: 'pipe',
    env: serverEnv,
    cwd: appServePath, // Important: définir le répertoire de travail
  });

  // Gérer les logs standard
  apiProc.stdout.on('data', (data) => {
    console.log(`API: ${data.toString().trim()}`);
  });

  // Gérer les logs d'erreur
  apiProc.stderr.on('data', (data) => {
    console.error(`API Error: ${data.toString().trim()}`);
  });

  // Gérer la fermeture du processus
  apiProc.on('close', (code) => {
    console.log(`Processus API fermé avec code: ${code}`);
    apiProcess = null;
  });

  return apiProc;
}

module.exports = {
  startAPIServer,
};
