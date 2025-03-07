import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

const NetworkAccess = () => {
  const isElectron = typeof window !== 'undefined' && !!window.electronAPI?.webServer;
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUrls, setShowUrls] = useState(true);

  useEffect(() => {
    if (isElectron) {
      setLoading(true);
      window.electronAPI.webServer
        .getMdnsServices()
        .then((services) => setServices(services))
        .catch((err) => {
          console.error('Erreur découverte mDNS:', err);
          setServices([]);
        })
        .finally(() => setLoading(false));
    }
  }, [isElectron]);

  if (!isElectron) return null;

  return (
    <div className="p-4 rounded-lg shadow mb-4 bg-blue-50 text-gray-800 dark:bg-gray-800 dark:text-white">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">
          Accès réseau local {services.length ? 'disponible' : 'indisponible'}
        </h3>
        <button
          onClick={() => setShowUrls(!showUrls)}
          className="px-3 py-1 rounded bg-blue-500 hover:bg-blue-600 text-white dark:bg-blue-700 dark:hover:bg-blue-600"
        >
          {loading ? (
            <Loader2 className="animate-spin inline-block" size={16} />
          ) : showUrls ? (
            'Masquer'
          ) : (
            'Découvrir via Bonjour'
          )}
        </button>
      </div>

      {showUrls && (
        <div className="mt-3">
          {loading ? (
            <p className="text-sm">Recherche des services via Bonjour...</p>
          ) : services.length === 0 ? (
            <p className="text-sm text-red-500">Aucun service découvert sur le réseau local.</p>
          ) : (
            <ul className="space-y-2">
              {services.map((service, index) => (
                <li key={index} className="border p-2 rounded shadow-sm bg-white dark:bg-gray-700">
                  <p className="font-semibold">{service.name}</p>
                  {service.addresses.map((addr, i) => (
                    <div key={i}>
                      <a
                        href={`http://${addr}:${service.port}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 dark:text-blue-400 hover:underline"
                      >
                        {`http://${addr}:${service.port}`}
                      </a>
                    </div>
                  ))}
                  <button
                    onClick={() =>
                      navigator.clipboard.writeText(
                        `http://${service.addresses[0]}:${service.port}`
                      )
                    }
                    className="mt-1 text-xs text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-100"
                  >
                    Copier URL
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
