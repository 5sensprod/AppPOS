// src/features/brands/components/BrandForm.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useBrand, useBrandExtras } from '../stores/brandStore';
import { EntityForm, EntityImageManager } from '../../../components/common';
import { ENTITY_CONFIG } from '../constants';

function BrandForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;

  // Hooks Zustand
  const { getBrandById, createBrand, updateBrand } = useBrand();
  const { uploadImage, deleteImage, syncBrand } = useBrandExtras();

  // États locaux
  const [brand, setBrand] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const hasTabs = ENTITY_CONFIG.tabs && ENTITY_CONFIG.tabs.length > 0;
  const [activeTab, setActiveTab] = useState(hasTabs ? 'general' : null);

  // Charger les données de la marque si on est en mode édition
  useEffect(() => {
    if (!id) return;

    setLoading(true);
    getBrandById(id)
      .then(setBrand)
      .catch(() => setError('Erreur lors du chargement de la marque.'))
      .finally(() => setLoading(false));
  }, [id, getBrandById]);

  // Valeurs initiales pour le formulaire
  const getInitialValues = () => {
    if (isNew) {
      return {
        name: '',
        description: '',
        slug: '',
      };
    }

    return brand || {};
  };

  // Gestionnaire de soumission du formulaire
  const handleSubmit = async (data) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Nettoyer les champs vides
    let formattedData = { ...data };
    Object.keys(formattedData).forEach((key) => {
      if (formattedData[key] === '') {
        formattedData[key] = '';
      }
    });

    try {
      if (isNew) {
        await createBrand(formattedData);
        setSuccess('Marque créée avec succès');
        navigate('/products/brands');
      } else {
        await updateBrand(id, formattedData);
        setSuccess('Marque mise à jour avec succès');
        // Recharger les données de la marque
        const updatedBrand = await getBrandById(id);
        setBrand(updatedBrand);
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la marque:', error);
      if (error.response) {
        console.error("Détails de l'erreur:", error.response.data);
        setError(`Erreur: ${error.response.data.error || 'Problème lors de la sauvegarde'}`);
      } else {
        setError('Erreur lors de la sauvegarde de la marque. Veuillez réessayer.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Gestionnaire d'annulation
  const handleCancel = () => {
    navigate(isNew ? '/products/brands' : `/products/brands/${id}`);
  };

  // Gestionnaire de synchronisation
  const handleSync = async () => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      await syncBrand(id);
      setSuccess('Marque synchronisée avec succès');
      // Recharger les données
      const updatedBrand = await getBrandById(id);
      setBrand(updatedBrand);
    } catch (error) {
      console.error('Erreur lors de la synchronisation:', error);
      setError('Erreur lors de la synchronisation de la marque');
    } finally {
      setLoading(false);
    }
  };

  // Préparer les champs du formulaire avec leur onglet
  const formFields = ENTITY_CONFIG.formFields.map((field) => ({
    ...field,
    tab: 'general', // Tous les champs de formulaire sont dans l'onglet "general"
  }));

  // Rendu du contenu des onglets
  const renderTabContent = (tabId) => {
    switch (tabId) {
      case 'general':
        return null; // Géré par EntityForm
      case 'images':
        if (!brand) return null;
        return (
          <EntityImageManager
            entity={brand}
            entityId={id}
            entityType="brand"
            galleryMode={false}
            onUploadImage={(id, file) => uploadImage(id, file)}
            onDeleteImage={(id) => deleteImage(id)}
            isLoading={loading}
            error={error}
          />
        );
      case 'woocommerce':
        if (!brand) return null;
        return (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                Informations WooCommerce
              </h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Statut de synchronisation:
                  </span>
                  <div>
                    {brand.woo_id ? (
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Synchronisé
                      </span>
                    ) : (
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        Non synchronisé
                      </span>
                    )}
                  </div>
                </div>

                {brand.woo_id && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">ID WooCommerce:</span>
                    <span className="font-mono text-sm">{brand.woo_id}</span>
                  </div>
                )}

                {brand.last_sync && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      Dernière synchronisation:
                    </span>
                    <span>{new Date(brand.last_sync).toLocaleString()}</span>
                  </div>
                )}

                <div className="pt-4">
                  <button
                    onClick={handleSync}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
                  >
                    {brand.woo_id ? 'Resynchroniser' : 'Synchroniser avec WooCommerce'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Formulaire principal */}
      {(!id || (id && brand)) && (
        <EntityForm
          fields={formFields}
          entityName="marque"
          isNew={isNew}
          initialValues={getInitialValues()}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={loading}
          error={error}
          successMessage={success}
          buttonLabel={isNew ? 'Créer la marque' : 'Mettre à jour la marque'}
          formTitle={isNew ? 'Nouvelle marque' : `Modifier ${brand?.name || 'la marque'}`}
          layout="tabs"
          tabs={ENTITY_CONFIG.tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      )}

      {/* Contenu des onglets spécifiques */}
      {!isNew && brand && activeTab !== 'general' && (
        <div className="mt-6">{renderTabContent(activeTab)}</div>
      )}
    </div>
  );
}

export default BrandForm;
