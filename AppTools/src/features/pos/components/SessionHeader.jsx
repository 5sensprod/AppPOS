// src/features/pos/components/SessionHeader.jsx - VERSION FINALE NETTOYÉE
import React, { useState, useEffect } from 'react';
import { useSessionStore } from '../../../stores/sessionStore';
import {
  LogIn,
  LogOut,
  Monitor,
  MonitorOff,
  Clock,
  Hash,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  ShoppingBag,
} from 'lucide-react';

const SessionHeader = () => {
  // ✅ HOOKS ZUSTAND SÉLECTIFS
  const cashierSession = useSessionStore((state) => state.cashierSession);
  const hasActiveCashierSession = useSessionStore((state) =>
    Boolean(state.cashierSession?.status === 'active')
  );
  const sessionLoading = useSessionStore((state) => state.sessionLoading);
  const sessionError = useSessionStore((state) => state.sessionError);
  const startSession = useSessionStore((state) => state.startSession);
  const stopSession = useSessionStore((state) => state.stopSession);

  const lcdStatus = useSessionStore((state) => state.lcdStatus);
  const lcdPorts = useSessionStore((state) => state.lcdPorts);
  const lcdLoading = useSessionStore((state) => state.lcdLoading);
  const lcdError = useSessionStore((state) => state.lcdError);
  const requestLCD = useSessionStore((state) => state.requestLCD);
  const releaseLCD = useSessionStore((state) => state.releaseLCD);
  const loadLCDPorts = useSessionStore((state) => state.loadLCDPorts);
  const user = useSessionStore((state) => state.user);

  // ✅ CALCULER STATUTS LCD
  const hasLCDControl = Boolean(lcdStatus?.owned && lcdStatus?.owner?.cashier_id === user?.id);

  // ✅ ÉTATS LOCAUX POUR UI
  const [showLCDSetup, setShowLCDSetup] = useState(false);
  const [selectedPort, setSelectedPort] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  // ✅ CONFIGURATION CAISSE (en dur pour l'instant, BDD plus tard)
  const CAISSE_CONFIG = {
    numero: '001', // ✅ TODO: Récupérer depuis BDD
    nom: 'Caisse Principale', // ✅ TODO: Récupérer depuis BDD
  };

  // ✅ HORLOGE SYNCHRONISÉE AVEC LE SYSTÈME
  useEffect(() => {
    // ✅ Fonction pour synchroniser avec le changement de minute système
    const syncWithSystemTime = () => {
      const now = new Date();
      setCurrentTime(now);

      // ✅ Calculer le délai jusqu'à la prochaine minute système
      const secondsUntilNextMinute = 60 - now.getSeconds();
      const millisecondsUntilNextMinute = secondsUntilNextMinute * 1000 - now.getMilliseconds();

      console.log(
        `🕐 [SESSION HEADER] Sync système: ${now.toLocaleTimeString()}, prochaine sync dans ${secondsUntilNextMinute}s`
      );

      // ✅ Programmer le prochain timer exactement au changement de minute
      return setTimeout(() => {
        setCurrentTime(new Date());
        console.log('🕐 [SESSION HEADER] Horloge synchronisée:', new Date().toLocaleTimeString());

        // ✅ Maintenant on peut utiliser un timer régulier de 60s
        const regularTimer = setInterval(() => {
          setCurrentTime(new Date());
          console.log('🕐 [SESSION HEADER] Horloge mise à jour:', new Date().toLocaleTimeString());
        }, 60000);

        // Retourner le timer pour le nettoyage
        return regularTimer;
      }, millisecondsUntilNextMinute);
    };

    // ✅ Démarrer la synchronisation
    const syncTimeout = syncWithSystemTime();
    let regularTimer = null;

    // ✅ Mise à jour immédiate
    setCurrentTime(new Date());
    console.log('🕐 [SESSION HEADER] Horloge initialisée (avec sync système)');

    return () => {
      if (syncTimeout) clearTimeout(syncTimeout);
      if (regularTimer) clearInterval(regularTimer);
      console.log('🕐 [SESSION HEADER] Timers nettoyés');
    };
  }, []);

  // ✅ TIMER SPÉCIAL POUR DURÉE SESSION (plus fréquent pour tests)
  useEffect(() => {
    if (!hasActiveCashierSession) return;

    console.log('⏱️ [SESSION HEADER] Timer durée session démarré');
    const durationTimer = setInterval(() => {
      // Force un re-render pour mettre à jour la durée
      setCurrentTime(new Date());
      console.log('⏱️ [SESSION HEADER] Durée session mise à jour');
    }, 30000); // Toutes les 30 secondes pour voir les changements

    return () => {
      clearInterval(durationTimer);
      console.log('⏱️ [SESSION HEADER] Timer durée session nettoyé');
    };
  }, [hasActiveCashierSession]);

  // ✅ CHARGER PORTS LCD
  useEffect(() => {
    loadLCDPorts().catch(() => {});
  }, [loadLCDPorts]);

  useEffect(() => {
    if (lcdPorts.length > 0 && !selectedPort) {
      setSelectedPort(lcdPorts[0].path);
    }
  }, [lcdPorts, selectedPort]);

  // ✅ HANDLERS
  const handleOpenSession = async () => {
    try {
      await startSession();
    } catch (error) {
      console.error('Erreur ouverture session:', error);
    }
  };

  const handleOpenSessionWithLCD = async () => {
    if (!selectedPort) return;

    try {
      await startSession(selectedPort, {
        baudRate: 9600,
        dataBits: 8,
        parity: 'none',
        stopBits: 1,
      });
      setShowLCDSetup(false);
    } catch (error) {
      console.error('Erreur ouverture session avec LCD:', error);
    }
  };

  const handleCloseSession = async () => {
    try {
      await stopSession();
    } catch (error) {
      console.error('Erreur fermeture session:', error);
    }
  };

  const handleRequestLCD = async () => {
    if (!selectedPort) return;

    try {
      await requestLCD(selectedPort, {
        baudRate: 9600,
        dataBits: 8,
        parity: 'none',
        stopBits: 1,
      });
      setShowLCDSetup(false);
    } catch (error) {
      console.error('Erreur connexion LCD:', error);
    }
  };

  const handleReleaseLCD = async () => {
    try {
      await releaseLCD();
    } catch (error) {
      console.error('Erreur libération LCD:', error);
    }
  };

  // ✅ CALCUL DURÉE SESSION AVEC DEBUG
  const getSessionDuration = () => {
    if (!cashierSession?.startTime) {
      console.log('⚠️ [SESSION HEADER] Pas de startTime pour calculer la durée');
      return '';
    }

    const start = new Date(cashierSession.startTime);
    const now = currentTime;
    const duration = Math.floor((now - start) / 1000 / 60); // minutes

    console.log('⏱️ [SESSION HEADER] Calcul durée:', {
      start: start.toLocaleTimeString(),
      now: now.toLocaleTimeString(),
      durationMinutes: duration,
    });

    if (duration < 60) return `${duration}min`;
    const hours = Math.floor(duration / 60);
    const mins = duration % 60;
    return `${hours}h${mins.toString().padStart(2, '0')}`;
  };

  // ✅ COMPOSANT LCD STATUS
  const LCDIndicator = () => {
    if (hasLCDControl) {
      return (
        <div className="flex items-center text-green-600 text-sm">
          <Monitor className="h-4 w-4 mr-1" />
          <span>LCD Connecté</span>
        </div>
      );
    }

    if (lcdStatus?.owned) {
      return (
        <div className="flex items-center text-yellow-600 text-sm">
          <MonitorOff className="h-4 w-4 mr-1" />
          <span>LCD par {lcdStatus.owner.username}</span>
        </div>
      );
    }

    return (
      <div className="flex items-center text-gray-500 text-sm">
        <MonitorOff className="h-4 w-4 mr-1" />
        <span>LCD Disponible</span>
      </div>
    );
  };

  // ✅ SESSION ACTIVE - HEADER PROFESSIONNEL
  if (hasActiveCashierSession) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-4">
        {/* ✅ LIGNE PRINCIPALE - DESIGN PROFESSIONNEL */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            {/* ✅ SECTION GAUCHE - IDENTITÉ CAISSE */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-100 dark:bg-blue-900 rounded-lg px-3 py-2">
                  <div className="flex items-center text-blue-700 dark:text-blue-300">
                    <Hash className="h-4 w-4 mr-1" />
                    <span className="font-bold text-lg">{CAISSE_CONFIG.numero}</span>
                  </div>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    {cashierSession.username}
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{CAISSE_CONFIG.nom}</p>
                </div>
              </div>

              {/* ✅ BADGE SESSION ACTIVE */}
              <div className="bg-green-100 dark:bg-green-900 rounded-lg px-3 py-2">
                <div className="flex items-center text-green-700 dark:text-green-300">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  <div>
                    <p className="font-semibold text-sm">Session Active</p>
                    <p className="text-xs text-green-600 dark:text-green-400">
                      {getSessionDuration()} • Depuis{' '}
                      {new Date(cashierSession.startTime).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ✅ SECTION DROITE - HEURE */}
            <div className="flex items-center text-gray-600 dark:text-gray-300">
              <Clock className="h-4 w-4 mr-2" />
              <span className="font-mono text-lg">
                {currentTime.toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>
        </div>

        {/* ✅ LIGNE INFÉRIEURE - STATISTIQUES ET CONTRÔLES */}
        <div className="px-6 py-3">
          <div className="flex items-center justify-between">
            {/* ✅ STATISTIQUES ET LCD */}
            <div className="flex items-center space-x-6">
              <div className="flex items-center text-gray-600 dark:text-gray-300">
                <ShoppingBag className="h-4 w-4 mr-2" />
                <span className="font-medium">
                  {cashierSession.sales_count} vente(s) • {cashierSession.total_sales.toFixed(2)}€
                </span>
              </div>

              <div className="h-4 w-px bg-gray-300 dark:bg-gray-600"></div>

              <LCDIndicator />
            </div>

            {/* ✅ BOUTONS D'ACTION */}
            <div className="flex items-center space-x-2">
              {!hasLCDControl && !lcdStatus?.owned && (
                <button
                  onClick={() => setShowLCDSetup(true)}
                  disabled={lcdLoading}
                  className="flex items-center px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md disabled:opacity-50 transition-colors"
                >
                  <Monitor className="h-4 w-4 mr-1" />
                  Connecter LCD
                </button>
              )}

              {hasLCDControl && (
                <button
                  onClick={handleReleaseLCD}
                  disabled={lcdLoading}
                  className="flex items-center px-3 py-1.5 text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-md disabled:opacity-50 transition-colors"
                >
                  <MonitorOff className="h-4 w-4 mr-1" />
                  Libérer LCD
                </button>
              )}

              <button
                onClick={handleCloseSession}
                disabled={sessionLoading}
                className="flex items-center px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-md disabled:opacity-50 transition-colors"
              >
                <LogOut className="h-4 w-4 mr-1" />
                Fermer Session
              </button>
            </div>
          </div>
        </div>

        {/* ✅ ERREURS (SI PRÉSENTES) */}
        {(sessionError || lcdError) && (
          <div className="mx-6 mb-4">
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center text-amber-800 dark:text-amber-200">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  <span className="text-sm font-medium">{sessionError || lcdError}</span>
                </div>
                <button
                  onClick={() => {
                    if (sessionError) useSessionStore.getState().setSessionError(null);
                    if (lcdError) useSessionStore.getState().setLcdError(null);
                  }}
                  className="text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200"
                >
                  ×
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ✅ PAS DE SESSION - HEADER PROFESSIONNEL
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-4">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* ✅ SECTION GAUCHE - IDENTITÉ CAISSE */}
          <div className="flex items-center space-x-4">
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2">
              <div className="flex items-center text-gray-600 dark:text-gray-300">
                <Hash className="h-4 w-4 mr-1" />
                <span className="font-bold text-lg">{CAISSE_CONFIG.numero}</span>
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {CAISSE_CONFIG.nom}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Aucune session active</p>
            </div>
          </div>

          {/* ✅ SECTION DROITE - HEURE + ACTIONS */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center text-gray-600 dark:text-gray-300">
              <Clock className="h-4 w-4 mr-2" />
              <span className="font-mono text-lg">
                {currentTime.toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>

            <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>

            <div className="flex space-x-2">
              <button
                onClick={handleOpenSession}
                disabled={sessionLoading}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 transition-colors"
              >
                {sessionLoading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <LogIn className="h-4 w-4 mr-2" />
                )}
                Ouvrir Session
              </button>

              <button
                onClick={() => setShowLCDSetup(true)}
                disabled={sessionLoading}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md disabled:opacity-50 transition-colors"
              >
                <Monitor className="h-4 w-4 mr-2" />
                Session + LCD
              </button>
            </div>
          </div>
        </div>

        {/* ✅ ERREUR SESSION */}
        {sessionError && (
          <div className="mt-4">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-red-800 dark:text-red-200">
                  {sessionError}
                </span>
                <button
                  onClick={() => useSessionStore.getState().setSessionError(null)}
                  className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
                >
                  ×
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ✅ MODAL SETUP LCD */}
      {showLCDSetup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-6 w-96 max-w-full">
            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">
              Configuration LCD
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Port série
              </label>
              <select
                value={selectedPort}
                onChange={(e) => setSelectedPort(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Sélectionner un port</option>
                {lcdPorts.map((port) => (
                  <option key={port.path} value={port.path}>
                    {port.path} - {port.description}
                  </option>
                ))}
              </select>
            </div>

            {lcdError && (
              <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
                <span className="text-sm text-red-800 dark:text-red-200">{lcdError}</span>
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowLCDSetup(false);
                  useSessionStore.getState().setLcdError(null);
                }}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Annuler
              </button>

              <button
                onClick={hasActiveCashierSession ? handleRequestLCD : handleOpenSessionWithLCD}
                disabled={!selectedPort || lcdLoading}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md disabled:opacity-50 transition-colors"
              >
                {lcdLoading
                  ? 'Connexion...'
                  : hasActiveCashierSession
                    ? 'Connecter LCD'
                    : 'Session + LCD'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionHeader;
