// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css';
import { AuthProvider } from './contexts/AuthContext';

// Initialiser le système de thème
import { themeManager } from './utils/themeManager';
// Initialiser les menus
import { initializeMenus } from './components/menu/initializeMenus';

// Exécuter l'initialisation
themeManager.initTheme();
initializeMenus();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <HashRouter>
        <App />
      </HashRouter>
    </AuthProvider>
  </React.StrictMode>
);
