// src/features/pos/components/SessionManager.jsx - VERSION ZUSTAND
import React, { useState, useEffect } from 'react';
import { useSessionCashier, useSessionLCD } from '../../../stores/sessionStore';
import {
  LogIn,
  LogOut,
  Monitor,
  MonitorOff,
  User,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

const SessionManager = () => {
  // ✅ HOOKS ZUSTAND SÉLECTIFS (re-render optimisé)
  const {
    cashierSession,
    hasActiveCashierSession,
    sessionLoading,
    sessionError,
    startSession,
    stopSession,
  } = useSessionCashier();

  const {
    lcdStatus,
    lcdPorts,
    hasLCDControl,
    lcdLoading,
    lcdError,
    requestLCD,
    releaseLCD,
    loadLCDPorts,
  } = useSessionLCD();

  // ✅ ÉTATS LOCAUX POUR UI
  const [showLCDSetup, setShowLCDSetup] = useState(false);
  const [selectedPort, setSelectedPort] = useState('');

  // ✅ CHARGER PORTS LCD AU MONTAGE
  useEffect(() => {
    loadLCDPorts().catch(() => {});
  }, [loadLCDPorts]);

  // ✅ SÉLECTION AUTO DU PREMIER PORT
  useEffect(() => {
    if (lcdPorts.length > 0 && !selectedPort) {
      setSelectedPort(lcdPorts[0].path);
    }
  }, [lcdPorts, selectedPort]);

  // ✅ HANDLERS SIMPLIFIÉS
  const handleOpenSession = async () => {
    try {
      await startSession();
      console.log('✅ [SESSION MANAGER] Session ouverte');
    } catch (error) {
      console.error('❌ [SESSION MANAGER] Erreur ouverture session:', error);
    }
  };

  const handleOpenSessionWithLCD = async () => {
    if (!selectedPort) {
      console.warn('⚠️ [SESSION MANAGER] Aucun port sélectionné');
      return;
    }

    try {
      await startSession(selectedPort, {
        baudRate: 9600,
        dataBits: 8,
        parity: 'none',
        stopBits: 1,
      });
      setShowLCDSetup(false);
      console.log('✅ [SESSION MANAGER] Session + LCD ouverte');
    } catch (error) {
      console.error('❌ [SESSION MANAGER] Erreur ouverture session avec LCD:', error);
    }
  };

  const handleCloseSession = async () => {
    try {
      await stopSession();
      console.log('✅ [SESSION MANAGER] Session fermée');
    } catch (error) {
      console.error('❌ [SESSION MANAGER] Erreur fermeture session:', error);
    }
  };

  const handleRequestLCD = async () => {
    if (!selectedPort) {
      console.warn('⚠️ [SESSION MANAGER] Aucun port sélectionné pour LCD');
      return;
    }

    try {
      await requestLCD(selectedPort, {
        baudRate: 9600,
        dataBits: 8,
        parity: 'none',
        stopBits: 1,
      });
      setShowLCDSetup(false);
      console.log('✅ [SESSION MANAGER] LCD connecté');
    } catch (error) {
      console.error('❌ [SESSION MANAGER] Erreur connexion LCD:', error);
    }
  };

  const handleReleaseLCD = async () => {
    try {
      await releaseLCD();
      console.log('✅ [SESSION MANAGER] LCD libéré');
    } catch (error) {
      console.error('❌ [SESSION MANAGER] Erreur libération LCD:', error);
    }
  };

  // ✅ COMPOSANT STATUT LCD
  const LCDStatusIndicator = () => {
    if (hasLCDControl) {
      return (
        <div className="flex items-center text-green-600 dark:text-green-400">
          <Monitor className="h-4 w-4 mr-1" />
          <span className="text-xs">LCD Connecté</span>
        </div>
      );
    }

    if (lcdStatus?.owned) {
      return (
        <div className="flex items-center text-yellow-600 dark:text-yellow-400">
          <MonitorOff className="h-4 w-4 mr-1" />
          <span className="text-xs">LCD Utilisé par {lcdStatus.owner.username}</span>
        </div>
      );
    }

    return (
      <div className="flex items-center text-gray-500 dark:text-gray-400">
        <MonitorOff className="h-4 w-4 mr-1" />
        <span className="text-xs">LCD Disponible</span>
      </div>
    );
  };

  // ✅ INTERFACE SESSION ACTIVE
  if (hasActiveCashierSession) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center text-green-600 dark:text-green-400">
              <CheckCircle className="h-5 w-5 mr-2" />
              <div>
                <p className="font-medium">Session Active</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Depuis {new Date(cashierSession.startTime).toLocaleTimeString()}
                </p>
              </div>
            </div>

            <div className="text-sm text-gray-600 dark:text-gray-300">
              <p>{cashierSession.sales_count} vente(s)</p>
              <p>{cashierSession.total_sales.toFixed(2)}€</p>
            </div>

            <LCDStatusIndicator />
          </div>

          <div className="flex items-center space-x-2">
            {!hasLCDControl && !lcdStatus?.owned && (
              <button
                onClick={() => setShowLCDSetup(true)}
                disabled={lcdLoading}
                className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200 disabled:opacity-50"
              >
                <Monitor className="h-4 w-4 mr-1 inline" />
                Connecter LCD
              </button>
            )}

            {hasLCDControl && (
              <button
                onClick={handleReleaseLCD}
                disabled={lcdLoading}
                className="text-sm bg-yellow-100 text-yellow-700 px-3 py-1 rounded hover:bg-yellow-200 disabled:opacity-50"
              >
                <MonitorOff className="h-4 w-4 mr-1 inline" />
                Libérer LCD
              </button>
            )}

            <button
              onClick={handleCloseSession}
              disabled={sessionLoading}
              className="text-sm bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200 disabled:opacity-50"
            >
              <LogOut className="h-4 w-4 mr-1 inline" />
              Fermer Session
            </button>
          </div>
        </div>

        {/* ✅ ERREURS UNIFIÉES */}
        {(sessionError || lcdError) && (
          <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded">
            <div className="flex items-center justify-between">
              <div className="flex items-center text-yellow-700 dark:text-yellow-300">
                <AlertTriangle className="h-4 w-4 mr-2" />
                <span className="text-sm">{sessionError || lcdError}</span>
              </div>
              <button
                onClick={() => {
                  // Clear erreurs via store
                  if (sessionError) useSessionStore.getState().setSessionError(null);
                  if (lcdError) useSessionStore.getState().setLcdError(null);
                }}
                className="text-yellow-700 dark:text-yellow-300 hover:text-yellow-900"
              >
                ×
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ✅ INTERFACE PAS DE SESSION
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-md">
      <div className="text-center">
        <User className="h-8 w-8 mx-auto mb-3 text-gray-400" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Aucune session active
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Ouvrez une session de caisse pour commencer
        </p>

        <div className="flex justify-center space-x-3">
          <button
            onClick={handleOpenSession}
            disabled={sessionLoading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 
                       disabled:opacity-50 flex items-center"
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
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 
                       disabled:opacity-50 flex items-center"
          >
            <Monitor className="h-4 w-4 mr-2" />
            Session + LCD
          </button>
        </div>

        {sessionError && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded">
            <div className="flex items-center justify-between">
              <span className="text-sm text-red-700 dark:text-red-300">{sessionError}</span>
              <button
                onClick={() => useSessionStore.getState().setSessionError(null)}
                className="text-red-700 dark:text-red-300 hover:text-red-900"
              >
                ×
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ✅ MODAL SETUP LCD */}
      {showLCDSetup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96">
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
                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
              <div className="mb-4 p-2 bg-red-50 dark:bg-red-900 border border-red-200 text-red-700 dark:text-red-300 text-sm rounded">
                {lcdError}
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowLCDSetup(false);
                  useSessionStore.getState().setLcdError(null);
                }}
                className="flex-1 bg-gray-500 text-white py-2 rounded hover:bg-gray-600"
              >
                Annuler
              </button>

              <button
                onClick={hasActiveCashierSession ? handleRequestLCD : handleOpenSessionWithLCD}
                disabled={!selectedPort || lcdLoading}
                className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-50"
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

export default SessionManager;
