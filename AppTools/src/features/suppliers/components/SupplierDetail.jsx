// src/features/suppliers/components/SupplierDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useSupplier, useSupplierExtras } from '../stores/supplierStore';
import { useSupplierDataStore } from '../stores/supplierStore';
import { useBrand } from '../../brands/stores/brandStore';
import { EntityDetail } from '../../../components/common';
import GeneralInfoTab from '../../../components/common/tabs/GeneralInfoTab';
import ContactInfoTab from '../../../components/common/tabs/ContactInfoTab';
import PaymentInfoTab from '../../../components/common/tabs/PaymentInfoTab';
import ImagesTab from '../../../components/common/tabs/ImagesTab';
import { getSupplierValidationSchema } from './validationSchema/getValidationSchema';

import { ENTITY_CONFIG } from '../constants';

function SupplierDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Déterminer le mode d'édition basé sur l'URL
  const isNew = location.pathname.endsWith('/new');
  const isEditMode = isNew || location.pathname.endsWith('/edit');
  const [brandsLoaded, setBrandsLoaded] = useState(false);
  // État local
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [supplier, setSupplier] = useState(null);
  const [specialFields, setSpecialFields] = useState({
    brands: { options: [] },
  });

  // Hooks et stores pour les fournisseurs
  const { getSupplierById, deleteSupplier, updateSupplier, createSupplier } = useSupplier();
  const { uploadImage, deleteImage, addBrandToSupplier, removeBrandFromSupplier } =
    useSupplierExtras();
  const supplierWsStore = useSupplierDataStore();

  // Hook pour accéder aux marques
  const brandStore = useBrand();
  const { fetchBrands } = brandStore;

  // Charger les options de marques
  useEffect(() => {
    if (brandsLoaded) return;

    const loadBrands = async () => {
      try {
        const response = await fetchBrands();
        const data = response?.data || [];

        if (Array.isArray(data)) {
          const brandOptions = data.map((brand) => ({
            value: brand._id || brand.id,
            label: brand.name,
            image: brand.image,
          }));

          setSpecialFields((prev) => ({
            ...prev,
            brands: { options: brandOptions },
          }));
          setBrandsLoaded(true);
        }
      } catch (err) {
        console.error('Erreur lors du chargement des marques:', err);
      }
    };

    loadBrands();
  }, [fetchBrands, brandsLoaded]);

  // Schéma de validation pour le formulaire
  const validationSchema = getSupplierValidationSchema(isNew);

  // Valeurs par défaut pour un nouveau fournisseur
  const defaultValues = {
    name: '',
    supplier_code: '',
    customer_code: '',
    brands: [],
    contact: {
      name: '',
      email: '',
      phone: '',
      address: '',
    },
    banking: {
      iban: '',
      bic: '',
    },
    payment_terms: {
      type: 'immediate',
      discount: 0,
    },
  };

  // Initialisation: charger les données du fournisseur
  useEffect(() => {
    if (isNew) {
      // Pour un nouveau fournisseur, utiliser les valeurs par défaut
      setSupplier(defaultValues);
      return;
    }

    if (!id) return;

    let cleanup = () => {};

    // Initialiser WebSocket si nécessaire
    if (supplierWsStore && supplierWsStore.initWebSocket) {
      console.log(`[DETAIL] Initialisation WebSocket pour supplier #${id}`);
      cleanup = supplierWsStore.initWebSocket();
    }

    // Charger les données du fournisseur
    setLoading(true);
    getSupplierById(id)
      .then((data) => {
        // Conversion des données pour le formulaire si nécessaire
        const formattedSupplier = {
          ...data,
          // S'assurer que brands est un tableau
          brands: Array.isArray(data.brands) ? data.brands : [],
        };

        setSupplier(formattedSupplier);
        setError(null);
      })
      .catch((err) => {
        console.error('Erreur lors de la récupération du fournisseur:', err);
        setError(`Erreur lors de la récupération du fournisseur: ${err.message}`);
      })
      .finally(() => setLoading(false));

    return cleanup;
  }, [id, isNew, getSupplierById, supplierWsStore]);

  // Gérer l'ajout d'une marque
  const handleAddBrand = async (brandId) => {
    if (!id || isNew) return;

    try {
      setLoading(true);

      // Utiliser la méthode API pour ajouter la marque
      await addBrandToSupplier(id, brandId);

      // Récupérer les données mises à jour
      const updatedSupplier = await getSupplierById(id);
      setSupplier(updatedSupplier);

      setSuccess('Marque ajoutée avec succès');
    } catch (err) {
      console.error("Erreur lors de l'ajout de la marque:", err);
      setError(`Erreur lors de l'ajout de la marque: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Gérer la suppression d'une marque
  const handleRemoveBrand = async (brandId) => {
    if (!id || isNew) return;

    try {
      setLoading(true);

      // Utiliser la méthode API pour retirer la marque
      await removeBrandFromSupplier(id, brandId);

      // Récupérer les données mises à jour
      const updatedSupplier = await getSupplierById(id);
      setSupplier(updatedSupplier);

      setSuccess('Marque retirée avec succès');
    } catch (err) {
      console.error('Erreur lors de la suppression de la marque:', err);
      setError(`Erreur lors de la suppression de la marque: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Gérer la soumission du formulaire
  const handleSubmit = async (data) => {
    setLoading(true);
    setError(null);

    try {
      // Formater les données
      const formattedData = formatSupplierData(data);

      if (isNew) {
        // Log avant création
        console.log("Création d'un nouveau fournisseur avec les données:", formattedData);

        // Créer un nouveau fournisseur
        const response = await createSupplier(formattedData);

        // Log complet de la réponse pour déterminer sa structure
        console.log("Réponse complète de l'API:", response);

        // Essayer différentes façons d'extraire l'ID
        const newId = response?.id || response?._id || response?.data?.id || response?.data?._id;

        console.log('ID extrait:', newId);

        if (newId) {
          // Définir le message de succès
          setSuccess('Fournisseur créé avec succès');

          // Log avant redirection
          console.log('Redirection vers:', `/products/suppliers/${newId}`);

          // Utiliser une redirection explicite avec remplacement d'historique
          navigate(`/products/suppliers/${newId}`, { replace: true });
        } else {
          console.error("Impossible d'extraire l'ID de la réponse:", response);
          setError("Fournisseur créé mais impossible d'extraire son ID");
          navigate('/products/suppliers');
        }
      } else {
        // Mise à jour du fournisseur existant
        await updateSupplier(id, formattedData);

        // Récupérer les données mises à jour
        const updatedSupplier = await getSupplierById(id);
        setSupplier(updatedSupplier);

        setSuccess('Fournisseur mis à jour avec succès');
      }

      return { success: true };
    } catch (err) {
      console.error('Erreur lors de la sauvegarde du fournisseur:', err);
      // Afficher la structure complète de l'erreur
      console.error("Structure d'erreur complète:", JSON.stringify(err, null, 2));

      const errorMessage = err.response?.data?.error || err.message || 'Erreur inconnue';
      setError(`Erreur: ${errorMessage}`);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour formater les données du fournisseur
  const formatSupplierData = (data) => {
    // Copie des données initiales
    const result = { name: data.name || 'Nouveau fournisseur' };

    // Fonction utilitaire pour ajouter uniquement les propriétés non vides
    const addIfNotEmpty = (obj, key, value) => {
      if (value !== undefined && value !== null && value !== '') {
        obj[key] = value;
      }
    };

    // Traitement des propriétés de premier niveau
    ['supplier_code', 'customer_code'].forEach((key) => {
      addIfNotEmpty(result, key, data[key]);
    });

    // Ajouter les marques si présentes
    if (data.brands && Array.isArray(data.brands) && data.brands.length > 0) {
      result.brands = data.brands;
    }

    // Traitement des objets imbriqués
    ['contact', 'banking', 'payment_terms'].forEach((objKey) => {
      if (data[objKey] && typeof data[objKey] === 'object') {
        const objData = {};
        let hasValues = false;

        // Parcourir les propriétés de l'objet
        Object.keys(data[objKey]).forEach((key) => {
          const value = data[objKey][key];
          if (value !== undefined && value !== null && value !== '') {
            objData[key] =
              key === 'discount' && !isNaN(parseFloat(value)) ? parseFloat(value) : value;
            hasValues = true;
          }
        });

        // N'ajouter l'objet que s'il contient des valeurs
        if (hasValues) {
          result[objKey] = objData;
        }
      }
    });

    return result;
  };

  // Gérer la suppression du fournisseur
  const handleDelete = async () => {
    try {
      setLoading(true);
      await deleteSupplier(id);
      // Rediriger vers la liste des fournisseurs
      navigate('/products/suppliers');
    } catch (err) {
      console.error('Erreur lors de la suppression du fournisseur:', err);
      setError(`Erreur lors de la suppression: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Gérer l'annulation du formulaire
  const handleCancel = () => {
    if (isNew) {
      // Retourner à la liste des fournisseurs
      navigate('/products/suppliers');
    } else {
      // Retourner à la page de détail
      navigate(`/products/suppliers/${id}`);
    }
  };

  // Gérer le téléversement d'image
  const handleUploadImage = async (entityId, file, isGallery = false) => {
    try {
      setLoading(true);
      await uploadImage(entityId, file);

      // Recharger les données
      const updatedSupplier = await getSupplierById(id);
      setSupplier(updatedSupplier);

      return { success: true };
    } catch (err) {
      console.error("Erreur lors de l'upload d'image:", err);
      setError(`Erreur lors de l'upload d'image: ${err.message}`);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Gérer la suppression d'image
  const handleDeleteImage = async (entityId, imageIndex = null, isGallery = false) => {
    try {
      setLoading(true);
      await deleteImage(entityId);

      // Recharger les données
      const updatedSupplier = await getSupplierById(id);
      setSupplier(updatedSupplier);

      return { success: true };
    } catch (err) {
      console.error("Erreur lors de la suppression d'image:", err);
      setError(`Erreur lors de la suppression d'image: ${err.message}`);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour rendre le contenu des onglets
  const renderTabContent = (entity, activeTab, formProps = {}) => {
    // Si formProps.editable est undefined, utiliser isEditMode
    const editable = formProps.editable !== undefined ? formProps.editable : isEditMode;
    const safeEntity = entity || {};

    switch (activeTab) {
      case 'general':
        return (
          <GeneralInfoTab
            entity={safeEntity}
            fields={['name', 'supplier_code', 'customer_code', 'brands']}
            editable={editable}
            _specialFields={specialFields}
          />
        );
      case 'contact':
        return <ContactInfoTab contact={safeEntity.contact || {}} editable={editable} />;
      case 'payment':
        return (
          <PaymentInfoTab
            banking={safeEntity.banking || {}}
            paymentTerms={safeEntity.payment_terms || {}}
            editable={editable}
          />
        );
      case 'images':
        return (
          <ImagesTab
            entity={safeEntity}
            entityId={id}
            entityType="supplier"
            galleryMode={false}
            onUploadImage={handleUploadImage}
            onDeleteImage={handleDeleteImage}
            isLoading={loading}
            error={error}
            editable={editable}
          />
        );
      default:
        return null;
    }
  };

  // Adapter defaultValues pour inclure le champ brands
  const formDefaultValues = {
    ...defaultValues,
    brands: supplier?.brands || [],
  };

  return (
    <EntityDetail
      entity={supplier}
      entityId={id}
      entityName="fournisseur"
      entityNamePlural="fournisseurs"
      baseRoute="/products/suppliers"
      tabs={ENTITY_CONFIG.tabs}
      renderTabContent={renderTabContent}
      actions={['edit', 'delete']}
      syncEnabled={false}
      onDelete={handleDelete}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      isLoading={loading}
      error={error}
      success={success}
      editable={isEditMode}
      validationSchema={validationSchema}
      defaultValues={formDefaultValues}
      formTitle={isNew ? 'Nouveau fournisseur' : `Modifier ${supplier?.name || 'le fournisseur'}`}
    />
  );
}

export default SupplierDetail;
