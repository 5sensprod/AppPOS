// electron-dev.js
const { spawn } = require('child_process');
const electron = require('electron');
const path = require('path');
const { platform } = require('os');

// Définir l'environnement comme développement
process.env.NODE_ENV = 'development';

let electronProcess = null;

// Démarrer Vite
console.log('Démarrage du serveur Vite...');
const vite = spawn('npx', ['vite', '--host'], {
  shell: true,
  stdio: ['ignore', 'pipe', 'pipe'],
  env: {
    ...process.env,
    BROWSER: 'none', // Empêcher l'ouverture automatique du navigateur
  },
});

// Afficher les logs de Vite
vite.stdout.on('data', (data) => {
  const message = data.toString();
  console.log(`Vite: ${message}`);

  // Attendre que Vite soit prêt avant de lancer Electron
  if (message.includes('ready in')) {
    console.log("Vite est prêt, démarrage d'Electron...");

    // Lancer Electron
    electronProcess = spawn(platform() === 'win32' ? 'npx.cmd' : 'npx', ['electron', '.'], {
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'development' },
    });

    electronProcess.on('close', () => {
      console.log("Electron s'est fermé, arrêt de Vite...");
      // Tuer le processus Vite lorsqu'Electron se ferme
      vite.kill();
      process.exit(0);
    });
  }
});

vite.stderr.on('data', (data) => {
  console.error(`Erreur Vite: ${data}`);
});

// Gérer l'arrêt propre
process.on('SIGINT', () => {
  console.log('SIGINT reçu, nettoyage...');
  if (electronProcess) electronProcess.kill();
  vite.kill();
  process.exit(0);
});

console.log('Script de démarrage initialisé.');
