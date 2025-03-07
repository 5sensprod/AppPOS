// src/components/MdnsStatus.jsx
import React, { useState, useEffect } from 'react';

function MdnsStatus() {
  const [discoveredServices, setDiscoveredServices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkServices = async () => {
      setIsLoading(true);
      try {
        if (window.electronAPI && window.electronAPI.webServer.getDiscoveredApiServices) {
          const services = window.electronAPI.webServer.getDiscoveredApiServices();
          setDiscoveredServices(services || []);
        }
      } catch (err) {
        console.error('Erreur lors de la récupération des services:', err);
      } finally {
        setIsLoading(false);
      }
    };

    checkServices();
    const interval = setInterval(checkServices, 5000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return <div className="p-2 text-gray-500">Chargement...</div>;
  }

  return (
    <div className="p-3 bg-green-50 rounded-lg mb-4">
      <h3 className="text-lg font-medium text-green-800 mb-2">Découverte de services</h3>
      {discoveredServices.length === 0 ? (
        <p className="text-sm text-gray-600">Aucun service API trouvé via mDNS</p>
      ) : (
        <div>
          <p className="text-sm text-gray-600 mb-2">
            {discoveredServices.length} service(s) API trouvé(s):
          </p>
          <ul className="space-y-1">
            {discoveredServices.map((service, index) => (
              <li key={index} className="text-sm bg-white p-2 rounded shadow-sm">
                <div className="font-medium">{service.name}</div>
                <div className="text-gray-500">{service.url}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default MdnsStatus;
