// src/features/products/components/ProductDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useProduct } from '../contexts/productContext';
import { EntityDetail, EntityImageManager } from '../../../components/common';
import { ENTITY_CONFIG } from '../constants';
import { CheckCircle, AlertCircle } from 'lucide-react';

function ProductDetail() {
  const { id } = useParams();
  const { getProductById, deleteProduct, syncProduct } = useProduct();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Charger les données du produit
  useEffect(() => {
    if (!id) return;

    setLoading(true);
    getProductById(id)
      .then(setProduct)
      .catch(() => setError('Erreur lors de la récupération du produit.'))
      .finally(() => setLoading(false));
  }, [id]);

  // Gérer la synchronisation du produit
  const handleSync = async (productId) => {
    try {
      await syncProduct(productId);

      // Recharger le produit pour obtenir les données à jour
      const updatedProduct = await getProductById(id);
      setProduct(updatedProduct);
    } catch (error) {
      console.error('Erreur lors de la synchronisation du produit:', error);
      throw error;
    }
  };

  // Rendu du contenu des onglets
  const renderTabContent = (product, activeTab) => {
    switch (activeTab) {
      case 'general':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                Informations générales
              </h2>

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Nom</h3>
                  <p className="mt-1 text-gray-900 dark:text-gray-100">{product.name}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">SKU</h3>
                  <p className="mt-1 text-gray-900 dark:text-gray-100">{product.sku || '-'}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Description
                  </h3>
                  <p className="mt-1 text-gray-900 dark:text-gray-100 whitespace-pre-line">
                    {product.description || '-'}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Statut</h3>
                  <p className="mt-1">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        product.status === 'published'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : product.status === 'draft'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                      }`}
                    >
                      {product.status === 'published'
                        ? 'Publié'
                        : product.status === 'draft'
                          ? 'Brouillon'
                          : 'Archivé'}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                Prix et marges
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Prix de vente
                  </h3>
                  <p className="mt-1 text-gray-900 dark:text-gray-100 font-medium">
                    {product.price ? `${product.price.toFixed(2)} €` : '-'}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Prix régulier
                  </h3>
                  <p className="mt-1 text-gray-900 dark:text-gray-100">
                    {product.regular_price ? `${product.regular_price.toFixed(2)} €` : '-'}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Prix promo
                  </h3>
                  <p className="mt-1 text-gray-900 dark:text-gray-100">
                    {product.sale_price ? `${product.sale_price.toFixed(2)} €` : '-'}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Prix d'achat
                  </h3>
                  <p className="mt-1 text-gray-900 dark:text-gray-100">
                    {product.purchase_price ? `${product.purchase_price.toFixed(2)} €` : '-'}
                  </p>
                </div>

                {product.margins && (
                  <>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Marge
                      </h3>
                      <p className="mt-1 text-gray-900 dark:text-gray-100">
                        {product.margins.amount ? `${product.margins.amount.toFixed(2)} €` : '-'}
                      </p>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Taux de marge
                      </h3>
                      <p className="mt-1 text-gray-900 dark:text-gray-100">
                        {product.margins.margin_rate
                          ? `${product.margins.margin_rate.toFixed(2)}%`
                          : '-'}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        );

      case 'inventory':
        return (
          <div className="space-y-8">
            <div>
              <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                Gestion des stocks
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Stock actuel
                  </h3>
                  <p
                    className={`mt-1 font-medium ${
                      product.stock <= product.min_stock
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    {product.stock !== undefined ? product.stock : '-'}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Stock minimum
                  </h3>
                  <p className="mt-1 text-gray-900 dark:text-gray-100">
                    {product.min_stock !== undefined ? product.min_stock : '-'}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Gestion de stock
                  </h3>
                  <p className="mt-1 text-gray-900 dark:text-gray-100">
                    {product.manage_stock ? 'Activée' : 'Désactivée'}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                Catégories et relations
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Catégorie principale
                  </h3>
                  <p className="mt-1 text-gray-900 dark:text-gray-100">
                    {product.category_id || '-'}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Marque</h3>
                  <p className="mt-1 text-gray-900 dark:text-gray-100">{product.brand_id || '-'}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Fournisseur
                  </h3>
                  <p className="mt-1 text-gray-900 dark:text-gray-100">
                    {product.supplier_id || '-'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'images':
        return (
          <EntityImageManager
            entity={product}
            entityId={id}
            entityType="product"
            galleryMode={true}
            onUploadImage={() => {}}
            onDeleteImage={() => {}}
            isLoading={false}
          />
        );

      case 'woocommerce':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                Statut de synchronisation
              </h2>

              {product.woo_id ? (
                <div className="bg-green-50 dark:bg-green-900 p-4 rounded-lg">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <CheckCircle className="h-5 w-5 text-green-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-green-800 dark:text-green-200">
                        Produit synchronisé avec WooCommerce
                      </h3>
                      <div className="mt-2 text-sm text-green-700 dark:text-green-300">
                        <p>ID WooCommerce : {product.woo_id}</p>
                        {product.last_sync && (
                          <p>
                            Dernière synchronisation :{' '}
                            {new Date(product.last_sync).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-50 dark:bg-yellow-900 p-4 rounded-lg">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <AlertCircle className="h-5 w-5 text-yellow-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                        Produit non synchronisé
                      </h3>
                      <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                        <p>Ce produit n'a pas encore été synchronisé avec WooCommerce.</p>
                        <button
                          onClick={() => handleSync(id)}
                          className="mt-2 px-3 py-1 text-xs font-medium rounded-md bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-800 dark:text-yellow-100 dark:hover:bg-yellow-700"
                        >
                          Synchroniser maintenant
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {product.website && (
              <div className="mt-4">
                <a
                  href={product.website}
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
                >
                  Voir le produit sur la boutique en ligne
                </a>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <EntityDetail
      entity={product}
      entityId={id}
      entityName="produit"
      entityNamePlural="produits"
      baseRoute="/products"
      tabs={ENTITY_CONFIG.tabs}
      renderTabContent={renderTabContent}
      actions={['edit', 'delete']}
      syncEnabled={ENTITY_CONFIG.syncEnabled}
      onDelete={deleteProduct}
      onSync={handleSync}
      isLoading={loading}
      error={error}
    />
  );
}

export default ProductDetail;
