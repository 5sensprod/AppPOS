import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Eye,
  EyeOff,
  User,
  Lock,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Loader2,
  ShieldCheck,
} from 'lucide-react';

// Templates de thèmes pour l'interface de connexion POS
const LOGIN_THEMES = {
  corporate: {
    background: 'bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900',
    card: 'bg-white/10 backdrop-blur-md border-white/20',
    primary: 'from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700',
    secondary: 'bg-white/10 hover:bg-white/20 border-white/20',
    accent: 'text-blue-400',
    text: {
      primary: 'text-white',
      secondary: 'text-slate-300',
      muted: 'text-slate-400',
    },
    decorative: [
      'absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl',
      'absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl',
    ],
  },
  dark: {
    background: 'bg-gradient-to-br from-gray-900 via-gray-800 to-black',
    card: 'bg-gray-800/50 backdrop-blur-sm border-gray-700/50',
    primary: 'from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700',
    secondary: 'bg-gray-700/50 hover:bg-gray-600/50 border-gray-600/50',
    accent: 'text-gray-300',
    text: {
      primary: 'text-white',
      secondary: 'text-gray-300',
      muted: 'text-gray-500',
    },
    decorative: [
      'absolute -top-32 -right-32 w-64 h-64 bg-gray-600/10 rounded-full blur-2xl',
      'absolute -bottom-32 -left-32 w-64 h-64 bg-gray-500/10 rounded-full blur-2xl',
    ],
  },
  modern: {
    background: 'bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900',
    card: 'bg-white/5 backdrop-blur-xl border-white/10',
    primary: 'from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700',
    secondary: 'bg-white/5 hover:bg-white/10 border-white/10',
    accent: 'text-indigo-400',
    text: {
      primary: 'text-white',
      secondary: 'text-indigo-200',
      muted: 'text-indigo-400',
    },
    decorative: [
      'absolute -top-40 -right-40 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl',
      'absolute -bottom-40 -left-40 w-80 h-80 bg-pink-500/20 rounded-full blur-3xl',
      'absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl',
    ],
  },
  pos: {
    background: 'bg-gradient-to-br from-emerald-900 via-teal-900 to-cyan-900',
    card: 'bg-white/10 backdrop-blur-lg border-emerald-500/20',
    primary: 'from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700',
    secondary: 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30',
    accent: 'text-emerald-400',
    text: {
      primary: 'text-white',
      secondary: 'text-emerald-100',
      muted: 'text-emerald-300',
    },
    decorative: [
      'absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl',
      'absolute -bottom-40 -left-40 w-80 h-80 bg-teal-500/20 rounded-full blur-3xl',
    ],
  },
};

function Login({ theme = 'corporate' }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { login, logout, isAuthenticated, user, error, loading } = useAuth();
  const navigate = useNavigate();

  // Récupération du thème sélectionné
  const currentTheme = LOGIN_THEMES[theme] || LOGIN_THEMES.corporate;

  const handleLogin = async (e) => {
    e.preventDefault();

    // Nettoyer l'erreur locale au début
    setLocalError('');

    const success = await login(username, password);
    if (success) {
      // Démarrer la transition douce
      setIsTransitioning(true);

      // Délai court pour voir la confirmation puis naviguer
      setTimeout(() => {
        navigate('/');
      }, 1000); // Plus court, plus subtil
    } else {
      // Si pas de succès et pas d'erreur dans le context, on met notre propre message
      if (!error) {
        setLocalError('Identifiants incorrects');
      }
    }
  };

  const handleLogout = () => {
    logout();
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Nettoyer l'erreur locale quand l'utilisateur tape
  const handleUsernameChange = (e) => {
    setUsername(e.target.value);
    setLocalError('');
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    setLocalError('');
  };

  // Utiliser l'erreur du context ou notre erreur locale
  const displayError = error || localError;

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${currentTheme.background}`}>
        <div className={`${currentTheme.card} rounded-2xl p-8 border shadow-2xl`}>
          <div className="flex items-center space-x-3">
            <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
            <span className={`${currentTheme.text.primary} font-medium`}>Chargement...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen flex items-center justify-center ${currentTheme.background} p-4 transition-opacity duration-500 ${
        isTransitioning ? 'opacity-95' : 'opacity-100'
      }`}
    >
      {/* Éléments décoratifs d'arrière-plan */}
      <div className="absolute inset-0 overflow-hidden">
        {currentTheme.decorative.map((decorativeClass, index) => (
          <div key={index} className={decorativeClass}></div>
        ))}
      </div>

      <div className="relative w-full max-w-md">
        {/* En-tête */}
        <div className="text-center mb-8">
          <div
            className={`inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r ${currentTheme.primary} rounded-2xl mb-4`}
          >
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className={`text-3xl font-bold ${currentTheme.text.primary} mb-2`}>appPOS</h1>
          <p className={currentTheme.text.muted}>Accès sécurisé à votre terminal</p>
        </div>

        {/* Carte principale */}
        <div className={`${currentTheme.card} rounded-2xl p-8 border shadow-2xl`}>
          {isAuthenticated || isTransitioning ? (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-green-500/20 rounded-full mb-4">
                <CheckCircle className="w-6 h-6 text-green-400" />
              </div>
              <h3 className={`text-xl font-semibold ${currentTheme.text.primary} mb-2`}>
                Connexion réussie
              </h3>
              <p className={`${currentTheme.text.secondary} mb-6`}>
                {isTransitioning ? (
                  <span className="inline-flex items-center space-x-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Redirection en cours...</span>
                  </span>
                ) : (
                  <>
                    Bienvenue,{' '}
                    <span className={`font-medium ${currentTheme.accent}`}>{user.username}</span>
                  </>
                )}
              </p>
              {!isTransitioning && (
                <div className="space-y-3">
                  <button
                    onClick={() => navigate('/')}
                    className={`w-full py-3 px-4 bg-gradient-to-r ${currentTheme.primary} text-white font-medium rounded-xl transform hover:scale-105 transition-all duration-200 shadow-lg`}
                  >
                    <span className="flex items-center justify-center space-x-2">
                      <span>Accéder au terminal</span>
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </button>
                  <button
                    onClick={handleLogout}
                    className={`w-full py-3 px-4 ${currentTheme.secondary} ${currentTheme.text.primary} font-medium rounded-xl border transition-all duration-200`}
                  >
                    Déconnexion
                  </button>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-6">
              <h2 className={`text-2xl font-bold ${currentTheme.text.primary} text-center mb-6`}>
                Authentification
              </h2>

              {/* Champ nom d'utilisateur */}
              <div className="space-y-2">
                <label className={`block text-sm font-medium ${currentTheme.text.secondary}`}>
                  Nom d'utilisateur
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className={`h-5 w-5 ${currentTheme.text.muted}`} />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={handleUsernameChange}
                    className={`w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl ${currentTheme.text.primary} placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm transition-all duration-200`}
                    placeholder="Saisissez votre nom d'utilisateur"
                    required
                  />
                </div>
              </div>

              {/* Champ mot de passe */}
              <div className="space-y-2">
                <label className={`block text-sm font-medium ${currentTheme.text.secondary}`}>
                  Mot de passe
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className={`h-5 w-5 ${currentTheme.text.muted}`} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={handlePasswordChange}
                    className={`w-full pl-10 pr-12 py-3 bg-white/10 border border-white/20 rounded-xl ${currentTheme.text.primary} placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm transition-all duration-200`}
                    placeholder="Saisissez votre mot de passe"
                    required
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className={`absolute inset-y-0 right-0 pr-3 flex items-center ${currentTheme.text.muted} hover:text-white transition-colors duration-200`}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Message d'erreur */}
              {displayError && (
                <div className="flex items-center space-x-2 p-3 bg-red-500/20 border border-red-500/30 rounded-xl">
                  <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                  <p className="text-red-300 text-sm">{displayError}</p>
                </div>
              )}

              {/* Bouton de connexion */}
              <button
                type="submit"
                className={`w-full py-3 px-4 bg-gradient-to-r ${currentTheme.primary} text-white font-medium rounded-xl transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900`}
              >
                <span className="flex items-center justify-center space-x-2">
                  <span>Se connecter</span>
                  <ArrowRight className="w-4 h-4" />
                </span>
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className={`${currentTheme.text.muted} text-sm`}>© 2025 by 5SENSPROD</p>
        </div>
      </div>
    </div>
  );
}

// Fonction utilitaire pour créer des variantes de login avec différents thèmes
export const createLoginVariant = (themeName) => {
  return (props) => <Login {...props} theme={themeName} />;
};

// Variantes prédéfinies
export const CorporateLogin = createLoginVariant('corporate');
export const DarkLogin = createLoginVariant('dark');
export const ModernLogin = createLoginVariant('modern');
export const POSLogin = createLoginVariant('pos');

export default Login;
