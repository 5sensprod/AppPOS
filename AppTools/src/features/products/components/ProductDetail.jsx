// src/features/products/components/ProductDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProduct } from '../contexts/productContext';
import { ENTITY_CONFIG } from '../constants';
import ProductImageManager from './ProductImageManager';
import { Edit, ArrowLeft, Trash, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getProductById, deleteProduct, syncProduct } = useProduct();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('general');

  // Charger les données du produit
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const productData = await getProductById(id);
        setProduct(productData);
        setLoading(false);
      } catch (error) {
        console.error('Erreur lors de la récupération du produit:', error);
        setError('Erreur lors de la récupération du produit. Veuillez réessayer.');
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id, getProductById]);

  // Gérer la suppression du produit
  const handleDelete = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) return;

    try {
      setLoading(true);
      await deleteProduct(id);
      setLoading(false);
      navigate('/products');
    } catch (error) {
      console.error('Erreur lors de la suppression du produit:', error);
      setError('Erreur lors de la suppression du produit. Veuillez réessayer.');
      setLoading(false);
    }
  };

  // Gérer la synchronisation du produit
  const handleSync = async () => {
    try {
      setLoading(true);
      await syncProduct(id);

      // Recharger le produit pour obtenir les données à jour
      const updatedProduct = await getProductById(id);
      setProduct(updatedProduct);

      setLoading(false);
    } catch (error) {
      console.error('Erreur lors de la synchronisation du produit:', error);
      setError('Erreur lors de la synchronisation du produit. Veuillez réessayer.');
      setLoading(false);
    }
  };

  // Affichage pendant le chargement
  if (loading && !product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Chargement du produit...</p>
        </div>
      </div>
    );
  }

  // Affichage en cas d'erreur
  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900 p-6 rounded-lg">
        <h2 className="text-red-800 dark:text-red-200 text-lg font-medium mb-2">
          Une erreur est survenue
        </h2>
        <p className="text-red-700 dark:text-red-300">{error}</p>
        <button
          onClick={() => navigate('/products')}
          className="mt-4 px-4 py-2 bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200 rounded-md hover:bg-red-200 dark:hover:bg-red-700"
        >
          Retour à la liste des produits
        </button>
      </div>
    );
  }

  // Si le produit n'existe pas
  if (!product) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900 p-6 rounded-lg">
        <h2 className="text-yellow-800 dark:text-yellow-200 text-lg font-medium mb-2">
          Produit non trouvé
        </h2>
        <p className="text-yellow-700 dark:text-yellow-300">
          Le produit que vous recherchez n'existe pas ou a été supprimé.
        </p>
        <button
          onClick={() => navigate('/products')}
          className="mt-4 px-4 py-2 bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 rounded-md hover:bg-yellow-200 dark:hover:bg-yellow-700"
        >
          Retour à la liste des produits
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* En-tête */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/products')}
            className="mr-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{product.name}</h1>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={() => navigate(`/products/${id}/edit`)}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200"
          >
            <Edit className="h-4 w-4 mr-2" />
            Modifier
          </button>

          <button
            onClick={handleSync}
            className={`flex items-center px-4 py-2 rounded-lg transition-colors duration-200 ${
              product.woo_id
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {product.woo_id ? 'Resynchroniser' : 'Synchroniser'}
          </button>

          <button
            onClick={handleDelete}
            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
          >
            <Trash className="h-4 w-4 mr-2" />
            Supprimer
          </button>
        </div>
      </div>

      {/* Onglets */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex -mb-px">
            {ENTITY_CONFIG.tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-6 text-sm font-medium ${
                  activeTab === tab.id
                    ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Contenu des onglets */}
        <div className="p-6">
          {activeTab === 'general' && (
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
          )}

          {activeTab === 'inventory' && (
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
                    <p className="mt-1 text-gray-900 dark:text-gray-100">
                      {product.brand_id || '-'}
                    </p>
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
          )}

          {activeTab === 'images' && <ProductImageManager product={product} />}

          {activeTab === 'woocommerce' && (
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
                            onClick={handleSync}
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
          )}
        </div>
      </div>
    </div>
  );
}

export default ProductDetail;
