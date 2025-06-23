// modules/splash.js - Module splash professionnel
const { BrowserWindow } = require('electron');

/**
 * Crée un splash screen professionnel
 * @param {Object} options - Options de configuration
 * @param {string} options.appName - Nom de l'application
 * @param {string} options.company - Nom de l'entreprise
 * @param {string} options.version - Version de l'application
 * @param {string} options.status - Message de statut
 * @param {string} options.theme - Thème ('dark', 'light', 'blue', 'corporate')
 * @returns {BrowserWindow} Instance de la fenêtre splash
 */
function createSplashWindow(options = {}) {
  const {
    appName = 'AppPOS',
    company = '5SENSPROD',
    version = '1.0.0',
    status = 'Démarrage du serveur...',
    theme = 'corporate',
  } = options;

  console.log('🚀 [SPLASH] Création du splash professionnel...');

  const splash = new BrowserWindow({
    width: 480,
    height: 320,
    frame: false,
    alwaysOnTop: true,
    transparent: false, // ✅ CHANGÉ : Pas de transparence
    resizable: false,
    maximizable: false,
    minimizable: false,
    backgroundColor: '#2c3e50', // ✅ NOUVEAU : Couleur de fond fixe
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false,
    },
  });

  const splashHtml = generateSplashHTML(appName, company, version, status, theme);
  splash.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(splashHtml));

  return splash;
}

/**
 * Met à jour le message de statut du splash
 * @param {BrowserWindow} splash - Instance du splash
 * @param {string} status - Nouveau message de statut
 */
function updateSplashStatus(splash, status) {
  if (splash && !splash.isDestroyed()) {
    splash.webContents.executeJavaScript(`
      const statusEl = document.querySelector('.status');
      if (statusEl) {
        statusEl.textContent = '${status}';
      }
    `);
  }
}

/**
 * Ferme le splash avec une animation
 * @param {BrowserWindow} splash - Instance du splash
 * @param {number} delay - Délai avant fermeture (ms)
 */
function closeSplash(splash, delay = 500) {
  if (splash && !splash.isDestroyed()) {
    setTimeout(() => {
      splash.webContents.executeJavaScript(`
        document.body.style.opacity = '0';
        document.body.style.transform = 'scale(0.95)';
      `);

      setTimeout(() => {
        if (!splash.isDestroyed()) {
          splash.close();
        }
      }, 300);
    }, delay);
  }
}

/**
 * Génère le HTML du splash selon le thème choisi
 */
function generateSplashHTML(appName, company, version, status, theme) {
  const themes = {
    corporate: {
      background: 'linear-gradient(135deg, #2c3e50 0%, #3498db 50%, #2980b9 100%)',
      primaryColor: '#ffffff',
      secondaryColor: 'rgba(255, 255, 255, 0.8)',
      accentColor: '#3498db',
      logoColor: '#ffffff',
    },
    dark: {
      background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #1a1a1a 100%)',
      primaryColor: '#ffffff',
      secondaryColor: 'rgba(255, 255, 255, 0.7)',
      accentColor: '#007acc',
      logoColor: '#007acc',
    },
    light: {
      background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 50%, #dee2e6 100%)',
      primaryColor: '#2c3e50',
      secondaryColor: '#6c757d',
      accentColor: '#007bff',
      logoColor: '#007bff',
    },
    blue: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #667eea 100%)',
      primaryColor: '#ffffff',
      secondaryColor: 'rgba(255, 255, 255, 0.9)',
      accentColor: '#764ba2',
      logoColor: '#ffffff',
    },
  };

  const currentTheme = themes[theme] || themes.corporate;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Chargement ${appName}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          html, body {
            width: 100%;
            height: 100%;
            background: ${currentTheme.background}; // ✅ CHANGÉ : Utilise le fond du thème
          }

          body {
            background: ${currentTheme.background};
            color: ${currentTheme.primaryColor};
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            height: 100vh;
            text-align: center;
            overflow: hidden;
            transition: all 0.3s ease;
            margin: 0;
            padding: 0;
          }

          .splash-container {
            max-width: 90%;
            animation: fadeInUp 0.8s ease-out;
          }

          .logo-section {
            margin-bottom: 30px;
          }

          .app-name {
            font-size: 32px;
            font-weight: 700;
            margin-bottom: 8px;
            letter-spacing: -0.5px;
          }

          .company-name {
            font-size: 16px;
            color: ${currentTheme.secondaryColor};
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 8px;
          }

          .version {
            font-size: 14px;
            color: ${currentTheme.secondaryColor};
            opacity: 0.8;
          }

          .loading-section {
            margin: 40px 0 20px;
          }

          .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid rgba(255, 255, 255, 0.2);
            border-radius: 50%;
            border-top-color: ${currentTheme.accentColor};
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
          }

          .status {
            font-size: 14px;
            color: ${currentTheme.secondaryColor};
            font-weight: 500;
            min-height: 20px;
          }

          .progress-bar {
            width: 200px;
            height: 3px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 2px;
            margin: 20px auto 0;
            overflow: hidden;
          }

          .progress-fill {
            height: 100%;
            background: ${currentTheme.accentColor};
            border-radius: 2px;
            animation: progress 2s ease-in-out infinite;
          }

          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }

          @keyframes progress {
            0% {
              width: 0%;
              margin-left: 0%;
            }
            50% {
              width: 75%;
              margin-left: 0%;
            }
            100% {
              width: 0%;
              margin-left: 100%;
            }
          }

          .footer {
            position: absolute;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 11px;
            color: ${currentTheme.secondaryColor};
            opacity: 0.6;
          }
        </style>
      </head>
      <body>
        <div class="splash-container">
          <div class="logo-section">
            <div class="app-name">${appName}</div>
            <div class="company-name">by ${company}</div>
            <div class="version">v${version}</div>
          </div>

          <div class="loading-section">
            <div class="spinner"></div>
            <div class="status">${status}</div>
            <div class="progress-bar">
              <div class="progress-fill"></div>
            </div>
          </div>
        </div>

        <div class="footer">
          © ${new Date().getFullYear()} ${company} - Tous droits réservés
        </div>

        <script>
          // Animation d'entrée progressive
          document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
              document.querySelector('.splash-container').style.transform = 'scale(1.02)';
              setTimeout(() => {
                document.querySelector('.splash-container').style.transform = 'scale(1)';
              }, 200);
            }, 500);
          });
        </script>
      </body>
    </html>
  `;
}

module.exports = {
  createSplashWindow,
  updateSplashStatus,
  closeSplash,
};
