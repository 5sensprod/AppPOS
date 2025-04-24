// src/features/products/components/CapturedProductsManager.jsx
import React, { useState, useEffect } from 'react';
import { useCapturedProducts } from '../hooks/useCapturedProducts';

/**
 * Composant pour visualiser et gérer les produits capturés
 */
const CapturedProductsManager = () => {
  const {
    capturedProducts,
    isCapturing,
    productUrls,
    continueCapture,
    exportCapturedProducts,
    getCaptureStatus,
  } = useCapturedProducts();

  const [captureStatus, setCaptureStatus] = useState([]);

  // Mettre à jour le statut de capture quand les produits ou URLs changent
  useEffect(() => {
    setCaptureStatus(getCaptureStatus());
  }, [capturedProducts, productUrls, getCaptureStatus]);

  const handleContinueCapture = (index) => {
    continueCapture(index);
  };

  const handleExport = () => {
    exportCapturedProducts();
  };

  if (capturedProducts.length === 0) {
    return (
      <div className="p-4">
        <h2 className="text-xl font-bold mb-2">Produits capturés</h2>
        <p className="text-gray-600">Aucun produit capturé pour le moment.</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Produits capturés ({capturedProducts.length})</h2>
        <div>
          <button
            onClick={() => continueCapture()}
            disabled={isCapturing}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded mr-2 disabled:opacity-50"
          >
            Continuer la capture
          </button>
          <button
            onClick={handleExport}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
          >
            Exporter
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="py-2 px-4 border-b text-left">#</th>
              <th className="py-2 px-4 border-b text-left">SKU</th>
              <th className="py-2 px-4 border-b text-left">Désignation</th>
              <th className="py-2 px-4 border-b text-left">URL</th>
              <th className="py-2 px-4 border-b text-left">Contenu</th>
              <th className="py-2 px-4 border-b text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {captureStatus.map((product, index) => (
              <tr key={product.id} className="hover:bg-gray-50">
                <td className="py-2 px-4 border-b">{index + 1}</td>
                <td className="py-2 px-4 border-b">{product.sku}</td>
                <td className="py-2 px-4 border-b">{product.designation}</td>
                <td className="py-2 px-4 border-b">
                  {product.hasUrl ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Capturée
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      Non capturée
                    </span>
                  )}
                </td>
                <td className="py-2 px-4 border-b">
                  <div className="space-y-1">
                    <div className="flex items-center">
                      <span className="w-20 text-xs text-gray-500">Titre :</span>
                      {product.hasTitle ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Oui
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Non
                        </span>
                      )}
                    </div>
                    <div className="flex items-center">
                      <span className="w-20 text-xs text-gray-500">Description :</span>
                      {product.hasDescription ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Oui
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Non
                        </span>
                      )}
                    </div>
                    <div className="flex items-center">
                      <span className="w-20 text-xs text-gray-500">Images :</span>
                      {product.hasImages ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Oui
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Non
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-2 px-4 border-b">
                  <button
                    onClick={() => handleContinueCapture(index)}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                  >
                    Reprendre
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CapturedProductsManager;
