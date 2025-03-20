// src/features/products/components/ProductDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useProduct, useProductExtras } from '../contexts/productContext';
import { EntityDetail, EntityImageManager } from '../../../components/common';
import { ENTITY_CONFIG } from '../constants';
import { CheckCircle, AlertCircle } from 'lucide-react';
import websocketService from '../../../services/websocketService';

function ProductDetail() {
  const { id } = useParams();
  const { getProductById, deleteProduct, syncProduct } = useProduct();
  const { uploadImage, uploadGalleryImage, deleteImage, deleteGalleryImage, setMainImage } =
    useProductExtras();

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

  useEffect(() => {
    // S'abonner aux mises à jour WebSocket des produits
    if (websocketService.isConnected) {
      console.log('[WS-DEBUG] Abonnement aux mises à jour de produits');
      websocketService.subscribe('products');
    }

    // Gestionnaire pour les mises à jour de produits
    const handleProductUpdate = ({ entityId, data }) => {
      console.log('[WS-DEBUG] Mise à jour de produit reçue:', entityId);
      if (entityId === id && data) {
        console.log('[WS-DEBUG] Mise à jour du produit actuel avec:', data);
        setProduct(data);
      }
    };

    // Gestionnaire pour les événements entity_updated
    const handleEntityUpdate = (payload) => {
      if (payload.entityType === 'products' && payload.entityId === id) {
        // Force une récupération complète du produit
        getProductById(id).then((updatedProduct) => {
          console.log('[WS-DEBUG] Produit rechargé:', updatedProduct);
          setProduct(updatedProduct);
        });
      }
    };

    // Gestionnaire pour la connexion WebSocket
    const handleConnect = () => {
      console.log('[WS-DEBUG] WebSocket connecté, abonnement aux produits');
      websocketService.subscribe('products');
    };

    // S'abonner aux événements
    websocketService.on('products_updated', handleProductUpdate);
    websocketService.on('entity_updated', handleEntityUpdate);
    websocketService.on('connect', handleConnect);

    return () => {
      // Nettoyer les abonnements
      websocketService.off('products_updated', handleProductUpdate);
      websocketService.off('entity_updated', handleEntityUpdate);
      websocketService.off('connect', handleConnect);
    };
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

  // Gérer la mise à jour du produit
  const handleUpdate = async (productId, updatedData) => {
    try {
      setLoading(true);
      await updateProduct(productId, updatedData);
      // Recharger le produit pour obtenir les données à jour
      const updatedProduct = await getProductById(id);
      setProduct(updatedProduct);
      return true;
    } catch (error) {
      console.error('Erreur lors de la mise à jour du produit:', error);
      setError('Erreur lors de la mise à jour du produit.');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Gestionnaires pour les images
  const handleUploadImage = async (productId, file, isGallery = false) => {
    try {
      setLoading(true);
      if (isGallery) {
        await uploadGalleryImage(productId, file);
      } else {
        await uploadImage(productId, file);
      }
      // Recharger le produit pour avoir les dernières images
      const updatedProduct = await getProductById(id);
      setProduct(updatedProduct);
      return true;
    } catch (error) {
      console.error("Erreur lors de l'upload d'image:", error);
      setError("Erreur lors de l'upload d'image");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteImage = async (productId, imageIndex, isGallery = false) => {
    try {
      setLoading(true);
      if (isGallery) {
        await deleteGalleryImage(productId, imageIndex);
      } else {
        await deleteImage(productId);
      }
      // Recharger le produit pour avoir les dernières images
      const updatedProduct = await getProductById(id);
      setProduct(updatedProduct);
      return true;
    } catch (error) {
      console.error("Erreur lors de la suppression d'image:", error);
      setError("Erreur lors de la suppression d'image");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleSetMainImage = async (productId, imageIndex) => {
    try {
      setLoading(true);
      await setMainImage(productId, imageIndex);
      // Recharger le produit pour avoir les dernières images
      const updatedProduct = await getProductById(id);
      setProduct(updatedProduct);
      return true;
    } catch (error) {
      console.error("Erreur lors de la définition de l'image principale:", error);
      setError("Erreur lors de la définition de l'image principale");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Rendu du contenu des onglets
  const renderTabContent = (product, activeTab, editOptions = {}) => {
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
                    {product.category_ref ? (
                      <>
                        {product.category_ref.name}
                        {product.category_ref.hierarchy &&
                          product.category_ref.hierarchy.length > 1 && (
                            <span className="text-xs text-gray-500 ml-2">
                              (Chemin:{' '}
                              {product.category_ref.hierarchy.map((cat) => cat.name).join(' > ')})
                            </span>
                          )}
                      </>
                    ) : (
                      '-'
                    )}
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
            onUploadImage={handleUploadImage}
            onDeleteImage={handleDeleteImage}
            onSetMainImage={handleSetMainImage}
            isLoading={loading}
            error={error}
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
                        Produit synchronisé avec la boutique en ligne
                      </h3>
                      <div className="mt-2 text-sm text-green-700 dark:text-green-300">
                        <p>ID Internet : {product.woo_id}</p>
                        {product.last_sync && (
                          <p>
                            Dernière synchronisation :{' '}
                            {new Date(product.last_sync).toLocaleString()}
                          </p>
                        )}
                        {product.pending_sync && (
                          <div className="mt-2">
                            <p className="text-yellow-600 dark:text-yellow-300">
                              Des modifications locales sont en attente de synchronisation
                            </p>
                            <button
                              onClick={() => handleSync(id)}
                              className="mt-2 px-3 py-1 text-xs font-medium rounded-md bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-800 dark:text-blue-100 dark:hover:bg-blue-700"
                            >
                              Synchroniser les modifications
                            </button>
                          </div>
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
      onUpdate={handleUpdate}
      isLoading={loading}
      error={error}
    />
  );
}

export default ProductDetail;
