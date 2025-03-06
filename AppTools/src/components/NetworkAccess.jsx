import React, { useState, useEffect } from 'react';

const NetworkAccess = () => {
  // Vérifier si exécuté dans Electron
  const isElectron =
    typeof window !== 'undefined' && !!window.electronAPI && !!window.electronAPI.webServer;
  const [networkUrls, setNetworkUrls] = useState([]);
  const [showUrls, setShowUrls] = useState(false);

  // Si pas dans Electron, ne pas afficher le composant
  if (!isElectron) {
    console.log('Non-Electron environment detected, hiding NetworkAccess component');
    return null;
  }

  useEffect(() => {
    const unsubscribe = window.electronAPI.webServer.onServerUrls(setNetworkUrls);
    window.electronAPI.webServer.requestNetworkUrls();
    return unsubscribe;
  }, []);

  return (
    <div className="p-4 bg-blue-50 rounded-lg shadow mb-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-blue-800">
          Accès réseau {networkUrls.length ? 'disponible' : 'indisponible'}
        </h3>
        <button
          onClick={() => {
            if (!showUrls) window.electronAPI.webServer.requestNetworkUrls();
            setShowUrls(!showUrls);
          }}
          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
        >
          {showUrls ? 'Masquer' : 'Afficher les URLs'}
        </button>
      </div>

      {showUrls && (
        <div className="mt-3">
          <p className="text-sm text-gray-600 mb-2">
            L'application est accessible sur le réseau local aux adresses suivantes:
          </p>
          {networkUrls.length === 0 ? (
            <p className="text-sm text-red-500">
              Aucune URL disponible.
              <button
                onClick={() => window.electronAPI.webServer.requestNetworkUrls()}
                className="ml-2 underline text-blue-500"
              >
                Actualiser
              </button>
            </p>
          ) : (
            <ul className="space-y-1">
              {networkUrls.map((url, index) => (
                <li key={index} className="flex items-center">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {url}
                  </a>
                  <button
                    onClick={() => navigator.clipboard.writeText(url)}
                    className="ml-2 text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded"
                  >
                    Copier
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default NetworkAccess;
