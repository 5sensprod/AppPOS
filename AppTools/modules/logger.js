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

function setupApiLogging(app, apiProcess) {
  if (!apiProcess) return;

  const apiLogPath = path.join(app.getPath('userData'), 'api-server.log');
  console.log(`Les logs API seront écrits dans: ${apiLogPath}`);

  const apiLogStream = fs.createWriteStream(apiLogPath, { flags: 'a' });
  apiLogStream.write(`[LOG ${new Date().toISOString()}] === DÉMARRAGE SERVEUR API ===\n`);

  // Rediriger la sortie standard et d'erreur du processus API
  apiProcess.stdout.on('data', (data) => {
    const output = data.toString().trim();
    console.log(`API: ${output}`);
    apiLogStream.write(`[API-OUT ${new Date().toISOString()}] ${output}\n`);
  });

  apiProcess.stderr.on('data', (data) => {
    const output = data.toString().trim();
    console.error(`API Error: ${output}`);
    apiLogStream.write(`[API-ERR ${new Date().toISOString()}] ${output}\n`);
  });

  // Journaliser les événements du processus
  apiProcess.on('error', (err) => {
    console.error(`API Process Error: ${err.message}`);
    apiLogStream.write(`[API-PROCESS-ERROR ${new Date().toISOString()}] ${err.message}\n`);
  });

  apiProcess.on('exit', (code, signal) => {
    console.log(`API Process Exit: code=${code}, signal=${signal}`);
    apiLogStream.write(`[API-EXIT ${new Date().toISOString()}] code=${code}, signal=${signal}\n`);
  });

  return apiLogStream;
}

// N'oubliez pas d'exporter la nouvelle fonction
module.exports = {
  setupLogs,
  setupFileLogging,
  setupApiLogging,
};
