// src/features/pos/components/SessionHeader.jsx - VERSION FINALE PROPRE
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
  FileText,
} from 'lucide-react';
import SessionOpeningModal from './SessionOpeningModal';

const SessionHeader = ({ onShowClosing, onShowReport, onShowHistory, onShowLCDConfig }) => {
  const cashierSession = useSessionStore((state) => state.cashierSession);
  const hasActiveCashierSession = useSessionStore((state) =>
    Boolean(state.cashierSession?.status === 'active')
  );
  const sessionLoading = useSessionStore((state) => state.sessionLoading);
  const sessionError = useSessionStore((state) => state.sessionError);
  const startSession = useSessionStore((state) => state.startSession);
  const syncInitialState = useSessionStore((state) => state.syncInitialState);
  const initWebSocketListeners = useSessionStore((state) => state.initWebSocketListeners);

  const lcdStatus = useSessionStore((state) => state.lcdStatus);
  const lcdPorts = useSessionStore((state) => state.lcdPorts);
  const lcdLoading = useSessionStore((state) => state.lcdLoading);
  const lcdError = useSessionStore((state) => state.lcdError);
  const releaseLCD = useSessionStore((state) => state.releaseLCD);
  const loadLCDPorts = useSessionStore((state) => state.loadLCDPorts);
  const user = useSessionStore((state) => state.user);

  const [showSessionOpenModal, setShowSessionOpenModal] = useState(false);
  const [serverTime, setServerTime] = useState(new Date());
  const [timeOffset, setTimeOffset] = useState(0);

  const hasLCDControl = Boolean(lcdStatus?.owned && lcdStatus?.owner?.cashier_id === user?.id);

  const CAISSE_CONFIG = {
    numero: '001',
    nom: 'Caisse Principale',
  };

  // Initialisation WebSocket + Sync initiale
  useEffect(() => {
    if (!user?.id) return;

    console.log(`🔄 [SESSION HEADER] Initialisation pour user ${user.id}`);

    syncInitialState().catch((error) => {
      console.warn('[SESSION HEADER] Erreur sync initiale:', error.message);
    });

    let cleanupWebSocket = null;

    initWebSocketListeners()
      .then((cleanup) => {
        if (cleanup && typeof cleanup === 'function') {
          cleanupWebSocket = cleanup;
          console.log('✅ [SESSION HEADER] Listeners WebSocket initialisés');
        }
      })
      .catch((error) => {
        console.warn('[SESSION HEADER] Erreur initialisation WebSocket:', error);
      });

    return () => {
      console.log('🧹 [SESSION HEADER] Nettoyage pour user', user.id);
      if (cleanupWebSocket) {
        cleanupWebSocket();
      }
    };
  }, [user?.id, syncInitialState, initWebSocketListeners]);

  // Temps serveur WebSocket
  useEffect(() => {
    import('../../../services/websocketService').then((module) => {
      const websocketService = module.default;
      if (!websocketService) return;

      const handleServerTimeUpdate = (payload) => {
        const serverTimestamp = payload.timestamp;
        const clientTimestamp = Date.now();
        const offset = serverTimestamp - clientTimestamp;

        setTimeOffset(offset);
        setServerTime(new Date(serverTimestamp));
      };

      websocketService.on('server.time.update', handleServerTimeUpdate);

      fetch('/api/time/current')
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            handleServerTimeUpdate(data.data);
          }
        })
        .catch((err) => console.error('Erreur sync temps initial:', err));

      return () => {
        websocketService.off('server.time.update', handleServerTimeUpdate);
      };
    });
  }, []);

  // Timer client pour temps serveur
  useEffect(() => {
    const clientTimer = setInterval(() => {
      const adjustedTime = new Date(Date.now() + timeOffset);
      setServerTime(adjustedTime);
    }, 1000);

    return () => clearInterval(clientTimer);
  }, [timeOffset]);

  // Chargement ports LCD
  useEffect(() => {
    loadLCDPorts().catch(() => {});
  }, [loadLCDPorts]);

  // Handlers
  const handleOpenSession = () => {
    setShowSessionOpenModal(true);
  };

  const handleOpenLCDConfig = () => {
    if (onShowLCDConfig) {
      onShowLCDConfig();
    } else {
      console.error('❌ onShowLCDConfig prop manquante !');
    }
  };

  const handleUnifiedSessionOpen = async (sessionData) => {
    try {
      const { useLCD, lcdPort, lcdConfig, drawer } = sessionData;
      await startSession(useLCD ? lcdPort : null, useLCD ? lcdConfig : {}, drawer);
      setShowSessionOpenModal(false);
      console.log('✅ Session + fond ouverts');
    } catch (error) {
      console.error('Erreur ouverture session:', error);
    }
  };

  const handleReleaseLCD = async () => {
    try {
      await releaseLCD();
      console.log('✅ LCD libéré');
    } catch (error) {
      console.error('Erreur libération LCD:', error);
    }
  };

  const getSessionDuration = () => {
    if (!cashierSession?.startTime) return '';

    const start = new Date(cashierSession.startTime);
    const now = serverTime;
    const duration = Math.floor((now - start) / 1000 / 60);

    if (duration < 60) return `${duration}min`;
    const hours = Math.floor(duration / 60);
    const mins = duration % 60;
    return `${hours}h${mins.toString().padStart(2, '0')}`;
  };

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

  // Affichage session active
  if (hasActiveCashierSession) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-4">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
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

            <div className="flex items-center text-gray-600 dark:text-gray-300">
              <Clock className="h-4 w-4 mr-2" />
              <span className="font-mono text-lg">
                {serverTime.toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>
        </div>

        <div className="px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="flex items-center text-gray-600 dark:text-gray-300">
                <ShoppingBag className="h-4 w-4 mr-2" />
                <span className="font-medium">
                  {cashierSession.sales_count || 0} vente(s) •{' '}
                  {(cashierSession.total_sales || 0).toFixed(2)}€
                </span>
              </div>

              <div className="h-4 w-px bg-gray-300 dark:bg-gray-600"></div>

              <LCDIndicator />
            </div>

            <div className="flex items-center space-x-2">
              {/* Bouton LCD */}
              {!hasLCDControl && (
                <button
                  onClick={handleOpenLCDConfig}
                  disabled={lcdLoading}
                  className="flex items-center px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md disabled:opacity-50 transition-colors"
                >
                  <Monitor className="h-4 w-4 mr-1" />
                  {lcdError ? 'Reconnecter LCD' : 'Connecter LCD'}
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

              {/* Autres boutons */}
              <button
                onClick={() => onShowHistory?.()}
                className="flex items-center px-3 py-1.5 text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-md transition-colors"
              >
                <FileText className="h-4 w-4 mr-1" />
                Historique
              </button>

              <button
                onClick={() => onShowClosing?.()}
                disabled={sessionLoading}
                className="flex items-center px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-md disabled:opacity-50 transition-colors"
              >
                <LogOut className="h-4 w-4 mr-1" />
                Fermer Session
              </button>

              <button
                onClick={() => onShowReport?.()}
                className="flex items-center px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
              >
                <FileText className="h-4 w-4 mr-1" />
                Rapport
              </button>
            </div>
          </div>
        </div>

        {/* Affichage erreurs */}
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

  // Affichage aucune session
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-4">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
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

          <div className="flex items-center space-x-4">
            <div className="flex items-center text-gray-600 dark:text-gray-300">
              <Clock className="h-4 w-4 mr-2" />
              <span className="font-mono text-lg">
                {serverTime.toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>

            <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>

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
              Démarrer la journée
            </button>
          </div>
        </div>

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

      {/* Modale pour session complète */}
      {showSessionOpenModal && (
        <SessionOpeningModal
          isOpen={showSessionOpenModal}
          onClose={() => setShowSessionOpenModal(false)}
          onConfirm={handleUnifiedSessionOpen}
          loading={sessionLoading || lcdLoading}
          lcdPorts={lcdPorts}
          lcdPreselected={false}
          lcdOnly={false}
          lcdError={lcdError}
        />
      )}
    </div>
  );
};

export default SessionHeader;
