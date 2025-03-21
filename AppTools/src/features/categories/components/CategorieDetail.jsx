// AppTools\src\features\categories\components\CategorieDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useCategory, useCategoryExtras } from '../contexts/categoryContext';
import { EntityDetail, EntityImageManager } from '../../../components/common';
import { ENTITY_CONFIG } from '../constants';
import { CheckCircle, AlertCircle } from 'lucide-react';
import websocketService from '../../../services/websocketService';

function CategorieDetail() {
  const { id } = useParams();
  const { getCategoryById, deleteCategory } = useCategory();
  const { uploadImage, deleteImage, syncCategory } = useCategoryExtras();

  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Charger les données de la catégorie
  useEffect(() => {
    if (!id) return;

    setLoading(true);
    getCategoryById(id)
      .then(setCategory)
      .catch(() => setError('Erreur lors de la récupération de la catégorie.'))
      .finally(() => setLoading(false));
  }, [id, getCategoryById]);

  useEffect(() => {
    // S'abonner aux mises à jour WebSocket des catégories
    if (websocketService.isConnected) {
      console.log('[WS-DEBUG] Abonnement aux mises à jour de catégories');
      websocketService.subscribe('categories');
    }

    // Gestionnaire pour les mises à jour de catégories
    const handleCategoryUpdate = ({ entityId, data }) => {
      console.log('[WS-DEBUG] Mise à jour de catégorie reçue:', entityId);
      if (entityId === id && data) {
        console.log('[WS-DEBUG] Mise à jour de la catégorie actuelle avec:', data);
        setCategory(data);
      }
    };

    // Gestionnaire pour la connexion WebSocket
    const handleConnect = () => {
      console.log('[WS-DEBUG] WebSocket connecté, abonnement aux catégories');
      websocketService.subscribe('categories');
    };

    // S'abonner aux événements
    websocketService.on('categories_updated', handleCategoryUpdate);
    websocketService.on('connect', handleConnect);

    return () => {
      // Nettoyer les abonnements
      websocketService.off('categories_updated', handleCategoryUpdate);
      websocketService.off('connect', handleConnect);
    };
  }, [id, getCategoryById]);

  // Gérer la synchronisation de la catégorie
  const handleSync = async (categoryId) => {
    try {
      setLoading(true);
      await syncCategory(categoryId);
      // Recharger la catégorie pour obtenir les données à jour
      const updatedCategory = await getCategoryById(id);
      setCategory(updatedCategory);
      return updatedCategory;
    } catch (error) {
      console.error('Erreur lors de la synchronisation de la catégorie:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Gestionnaires pour les images
  const handleUploadImage = async (categoryId, file) => {
    try {
      setLoading(true);
      await uploadImage(categoryId, file);
      // Recharger la catégorie pour avoir les dernières images
      const updatedCategory = await getCategoryById(id);
      setCategory(updatedCategory);
      return true;
    } catch (error) {
      console.error("Erreur lors de l'upload d'image:", error);
      setError("Erreur lors de l'upload d'image");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteImage = async (categoryId) => {
    try {
      setLoading(true);
      await deleteImage(categoryId);
      // Recharger la catégorie pour avoir les dernières images
      const updatedCategory = await getCategoryById(id);
      setCategory(updatedCategory);
      return true;
    } catch (error) {
      console.error("Erreur lors de la suppression d'image:", error);
      setError("Erreur lors de la suppression d'image");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Rendu du contenu des onglets
  const renderTabContent = (category, activeTab) => {
    switch (activeTab) {
      case 'general':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                  Informations générales
                </h2>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Nom</h3>
                    <p className="mt-1 text-gray-900 dark:text-gray-100">{category.name}</p>
                  </div>

                  {/* <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Slug</h3>
                    <p className="mt-1 text-gray-900 dark:text-gray-100">{category.slug || '-'}</p>
                  </div> */}

                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Catégorie parente
                    </h3>
                    <p className="mt-1 text-gray-900 dark:text-gray-100">
                      {category.parent_id ? category.parent_name || category.parent_id : 'Aucune'}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Nombre d'articles
                    </h3>
                    <p className="mt-1">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {category.product_count || 0}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                  Description
                </h2>
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md min-h-[200px]">
                  {category.description ? (
                    <div dangerouslySetInnerHTML={{ __html: category.description }} />
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 italic">Aucune description</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case 'images':
        return (
          <EntityImageManager
            entity={category}
            entityId={id}
            entityType="category"
            galleryMode={false}
            onUploadImage={(id, file) => handleUploadImage(id, file)}
            onDeleteImage={() => handleDeleteImage(id)}
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

              {category.woo_id ? (
                <div className="bg-green-50 dark:bg-green-900 p-4 rounded-lg">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <CheckCircle className="h-5 w-5 text-green-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-green-800 dark:text-green-200">
                        Catégorie synchronisée avec la boutique en ligne
                      </h3>
                      <div className="mt-2 text-sm text-green-700 dark:text-green-300">
                        <p>ID Internet : {category.woo_id}</p>
                        {category.last_sync && (
                          <p>
                            Dernière synchronisation :{' '}
                            {new Date(category.last_sync).toLocaleString()}
                          </p>
                        )}
                        {category.pending_sync && (
                          <p className="mt-2 text-yellow-600 dark:text-yellow-300">
                            Des modifications locales sont en attente de synchronisation
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
                        Catégorie non synchronisée
                      </h3>
                      <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                        <p>Cette catégorie n'a pas encore été synchronisée avec WooCommerce.</p>
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
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <EntityDetail
      entity={category}
      entityId={id}
      entityName="catégorie"
      entityNamePlural="catégories"
      baseRoute="/products/categories" // Chemin modifié selon votre structure de route
      tabs={ENTITY_CONFIG.tabs}
      renderTabContent={renderTabContent}
      actions={['edit', 'delete']}
      syncEnabled={ENTITY_CONFIG.syncEnabled}
      onDelete={deleteCategory}
      onSync={handleSync}
      isLoading={loading}
      error={error}
    />
  );
}

export default CategorieDetail;
