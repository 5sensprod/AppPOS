// UpdateChecker.jsx
import React, { useEffect, useState } from 'react';

const UpdateChecker = () => {
  const [updateStatus, setUpdateStatus] = useState(null);
  const [progress, setProgress] = useState(0);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationType, setNotificationType] = useState('info'); // 'info', 'success', 'error'

  useEffect(() => {
    // Vérifier si l'API Electron est disponible
    if (window.electronAPI) {
      // Écouter les messages de mise à jour
      const removeListener = window.electronAPI.onUpdateMessage((data) => {
        console.log('Message de mise à jour reçu:', data);
        setUpdateStatus(data.message);

        if (data.progress) {
          setProgress(data.progress.percent);
        }

        // Définir le type de notification
        if (data.message === 'Erreur lors de la mise à jour') {
          setNotificationType('error');
        } else if (data.message === 'Mise à jour téléchargée') {
          setNotificationType('success');
        } else {
          setNotificationType('info');
        }

        // Afficher la notification pour tous les messages significatifs
        if (
          data.message === 'Mise à jour disponible' ||
          data.message === 'Mise à jour téléchargée' ||
          data.message === 'Erreur lors de la mise à jour' ||
          data.message === 'Aucune mise à jour disponible'
        ) {
          setShowNotification(true);

          // Masquer la notification automatiquement après 5 secondes pour "Aucune mise à jour disponible"
          if (data.message === 'Aucune mise à jour disponible') {
            setTimeout(() => {
              setShowNotification(false);
            }, 5000);
          }
        }
      });

      // Nettoyer l'écouteur lors du démontage du composant
      return () => {
        if (typeof removeListener === 'function') {
          removeListener();
        }
      };
    }
  }, []);

  // Déclencher manuellement une vérification de mise à jour
  const checkForUpdates = () => {
    if (window.electronAPI) {
      window.electronAPI.checkForUpdates();
      setUpdateStatus('Vérification des mises à jour...');
      setShowNotification(true);
      setNotificationType('info');
    } else {
      console.error("L'API Electron n'est pas disponible");
    }
  };

  // Fermer la notification
  const closeNotification = () => {
    setShowNotification(false);
  };

  // Obtenir la couleur de bordure en fonction du type de notification
  const getBorderColor = () => {
    switch (notificationType) {
      case 'success':
        return 'border-green-500';
      case 'error':
        return 'border-red-500';
      default:
        return 'border-blue-500';
    }
  };

  return (
    <div>
      {/* Bouton pour vérifier les mises à jour */}
      <button
        onClick={checkForUpdates}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Vérifier les mises à jour
      </button>

      {/* Barre de progression */}
      {progress > 0 && (
        <div className="mt-4 w-full h-2 bg-gray-200 rounded-full">
          <div className="h-full bg-green-500 rounded-full" style={{ width: `${progress}%` }}></div>
          <div className="text-sm text-center mt-1">{progress.toFixed(1)}% téléchargé</div>
        </div>
      )}

      {/* Notification */}
      {showNotification && (
        <div
          className={`fixed bottom-4 right-4 bg-white shadow-lg rounded-lg p-4 max-w-md border-l-4 ${getBorderColor()} transition-all duration-300 ease-in-out`}
        >
          <div className="flex justify-between">
            <h3 className="font-semibold text-lg">Notification de mise à jour</h3>
            <button onClick={closeNotification} className="text-gray-500 hover:text-gray-700">
              &times;
            </button>
          </div>
          <p className="mt-2">{updateStatus}</p>
          {updateStatus === 'Aucune mise à jour disponible' && (
            <p className="text-sm text-gray-600 mt-1">Votre application est à jour.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default UpdateChecker;
