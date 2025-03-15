import React, { useState, useEffect } from 'react';
import { Pencil, Trash2, RotateCw, CheckCircle, XCircle } from 'lucide-react';
import apiService from '../services/api';
import imageProxyService from '../services/imageProxyService';

function BrandsTable() {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncStatus, setSyncStatus] = useState({});

  const fetchBrands = async () => {
    setLoading(true);
    try {
      const response = await apiService.get('/api/brands');
      console.log('Réponse API:', response);

      // Extraire le tableau de marques de la structure imbriquée
      const brandsData =
        response.data.success && Array.isArray(response.data.data) ? response.data.data : [];

      console.log('Données de marques:', brandsData);
      setBrands(brandsData);
      setError(null);
    } catch (error) {
      setError('Erreur lors du chargement des marques');
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (id) => {
    setSyncStatus((prev) => ({ ...prev, [id]: 'loading' }));
    try {
      await apiService.post(`/api/brands/${id}/sync`);
      setSyncStatus((prev) => ({ ...prev, [id]: 'success' }));
      setTimeout(() => {
        setSyncStatus((prev) => {
          const newStatus = { ...prev };
          delete newStatus[id];
          return newStatus;
        });
      }, 2000);
      fetchBrands(); // Rafraîchir les données
    } catch (error) {
      setSyncStatus((prev) => ({ ...prev, [id]: 'error' }));
      console.error('Erreur de synchronisation:', error);
      setTimeout(() => {
        setSyncStatus((prev) => {
          const newStatus = { ...prev };
          delete newStatus[id];
          return newStatus;
        });
      }, 2000);
    }
  };

  const handleEdit = (id) => {
    window.location.href = `/products/brands/${id}/edit`;
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette marque?')) return;

    try {
      await apiService.delete(`/api/brands/${id}`);
      fetchBrands();
    } catch (error) {
      alert('Erreur lors de la suppression');
      console.error('Erreur:', error);
    }
  };

  useEffect(() => {
    fetchBrands();

    // S'abonner aux événements websocket
    const onBrandUpdate = () => fetchBrands();
    const websocketService = window.websocketService || { on: () => {}, off: () => {} };

    websocketService.on('brands_updated', onBrandUpdate);
    websocketService.on('brands_created', onBrandUpdate);
    websocketService.on('brands_deleted', onBrandUpdate);

    return () => {
      websocketService.off('brands_updated', onBrandUpdate);
      websocketService.off('brands_created', onBrandUpdate);
      websocketService.off('brands_deleted', onBrandUpdate);
    };
  }, []);

  const renderSyncStatus = (id) => {
    switch (syncStatus[id]) {
      case 'loading':
        return <RotateCw className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <RotateCw className="h-5 w-5 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="flex justify-between items-center p-4 border-b">
        <h2 className="text-lg font-semibold text-gray-800">Marques</h2>
        <button
          onClick={() => (window.location.href = '/products/brands/new')}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Nouvelle marque
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Image
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Nom
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Description
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Statut WC
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {brands.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">
                  Aucune marque trouvée
                </td>
              </tr>
            ) : (
              brands.map((brand) => (
                <tr key={brand._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {brand.image ? (
                      <img
                        src={imageProxyService.getImageUrl(brand.image.src)}
                        alt={brand.name}
                        className="h-10 w-10 object-cover rounded"
                      />
                    ) : (
                      <div className="h-10 w-10 bg-gray-200 rounded flex items-center justify-center">
                        <span className="text-xs text-gray-500">Aucune</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {brand.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                    {brand.description || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {brand.woo_id ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Synchronisé
                      </span>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        Non synchronisé
                      </span>
                    )}
                    {brand.pending_sync && (
                      <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        Modifié
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(brand._id)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        <Pencil className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(brand._id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleSync(brand._id)}
                        className={`${
                          syncStatus[brand._id] === 'loading'
                            ? 'cursor-not-allowed'
                            : 'hover:text-blue-900'
                        } text-blue-600`}
                        disabled={syncStatus[brand._id] === 'loading'}
                      >
                        {renderSyncStatus(brand._id)}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default BrandsTable;
