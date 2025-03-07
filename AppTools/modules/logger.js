// modules/logger.js
const fs = require('fs');
const path = require('path');

// Configuration des logs
function setupLogs(log, autoUpdater) {
  // Configuration des logs détaillés
  log.transports.file.level = 'debug';

  // Configuration du logger pour autoUpdater
  if (autoUpdater) {
    autoUpdater.logger = log;
    autoUpdater.logger.transports.file.level = 'debug';
    console.log('Fichier de log autoUpdater:', log.transports.file.getFile().path);
  }
}

// Configurer la redirection des logs vers un fichier
function setupFileLogging(app) {
  const logPath = path.join(app.getPath('userData'), 'app.log');
  console.log(`Les logs seront écrits dans: ${logPath}`);

  // Rediriger la console vers un fichier
  const logStream = fs.createWriteStream(logPath, { flags: 'a' });
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;

  console.log = function (...args) {
    const message = args
      .map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : arg))
      .join(' ');
    logStream.write(`[LOG ${new Date().toISOString()}] ${message}\n`);
    originalConsoleLog.apply(console, args);
  };

  console.error = function (...args) {
    const message = args
      .map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : arg))
      .join(' ');
    logStream.write(`[ERROR ${new Date().toISOString()}] ${message}\n`);
    originalConsoleError.apply(console, args);
  };
}

module.exports = {
  setupLogs,
  setupFileLogging,
};
