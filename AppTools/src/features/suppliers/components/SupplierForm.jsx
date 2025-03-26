// src/features/suppliers/components/SupplierForm.jsx
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSupplier, useSupplierExtras } from '../stores/supplierStore';
import { EntityForm } from '../../../components/common';
import ImagesTab from '../../../components/common/tabs/ImagesTab';
import { ENTITY_CONFIG } from '../constants';
import { useEntityForm } from '../../../hooks/useEntityForm';

function SupplierForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;

  // Hooks Zustand
  const { getSupplierById, createSupplier, updateSupplier } = useSupplier();
  const { uploadImage, deleteImage } = useSupplierExtras();

  // État local pour l'onglet actif
  const [activeTab, setActiveTab] = useState(
    ENTITY_CONFIG.tabs.length > 0 ? ENTITY_CONFIG.tabs[0].id : 'general'
  );

  // Valeurs par défaut pour un nouveau fournisseur
  const defaultValues = {
    name: '',
    supplier_code: '',
    customer_code: '',
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

  // Fonction de formatage des données spécifique aux fournisseurs
  const formatSupplierData = (data) => {
    // Assurez-vous que toutes les valeurs obligatoires sont présentes
    const formattedData = { ...data };

    // Vérifiez si les valeurs requises sont présentes et ont les bons types
    if (!formattedData.name || formattedData.name.trim() === '') {
      formattedData.name = 'Nouveau fournisseur'; // Valeur par défaut si vide
    }

    // Restructuration des champs imbriqués...

    // S'assurer que tous les objets imbriqués existent
    formattedData.contact = formattedData.contact || {};
    formattedData.banking = formattedData.banking || {};
    formattedData.payment_terms = formattedData.payment_terms || {};

    // Convertir les valeurs numériques
    if (formattedData.payment_terms.discount) {
      formattedData.payment_terms.discount = parseFloat(formattedData.payment_terms.discount);
    }

    return formattedData;
  };

  // Utilisation du hook useEntityForm
  const {
    entity: supplier,
    loading,
    error,
    success,
    handleSubmit,
    handleUploadImage,
    handleDeleteImage,
  } = useEntityForm({
    id,
    entityType: 'fournisseur',
    getEntityById: getSupplierById,
    createEntity: createSupplier,
    updateEntity: updateSupplier,
    uploadImage,
    deleteImage,
    defaultValues,
    formatData: formatSupplierData,
  });

  // Préparation des champs du formulaire
  const getFormFields = () => {
    return [
      // Onglet général
      {
        name: 'name',
        label: 'Nom du fournisseur',
        type: 'text',
        required: true,
        tab: 'general',
      },
      {
        name: 'supplier_code',
        label: 'Code fournisseur',
        type: 'text',
        tab: 'general',
      },
      {
        name: 'customer_code',
        label: 'Code client',
        type: 'text',
        tab: 'general',
      },

      // Onglet contact
      {
        name: 'contact.name',
        label: 'Nom du contact',
        type: 'text',
        tab: 'contact',
      },
      {
        name: 'contact.email',
        label: 'Email',
        type: 'email',
        tab: 'contact',
      },
      {
        name: 'contact.phone',
        label: 'Téléphone',
        type: 'text',
        tab: 'contact',
      },
      {
        name: 'contact.address',
        label: 'Adresse',
        type: 'textarea',
        rows: 3,
        tab: 'contact',
      },

      // Onglet paiement
      {
        name: 'banking.iban',
        label: 'IBAN',
        type: 'text',
        tab: 'payment',
      },
      {
        name: 'banking.bic',
        label: 'BIC',
        type: 'text',
        tab: 'payment',
      },
      {
        name: 'payment_terms.type',
        label: 'Conditions de paiement',
        type: 'select',
        options: [
          { value: 'immediate', label: 'Immédiat' },
          { value: '30days', label: '30 jours' },
          { value: '60days', label: '60 jours' },
          { value: '90days', label: '90 jours' },
        ],
        tab: 'payment',
      },
      {
        name: 'payment_terms.discount',
        label: 'Remise (%)',
        type: 'number',
        min: 0,
        max: 100,
        step: 0.01,
        tab: 'payment',
      },
    ];
  };

  // Gérer la soumission du formulaire
  const onSubmitForm = async (data) => {
    const result = await handleSubmit(data);

    if (result && result.success) {
      navigate(isNew ? '/products/suppliers' : `/products/suppliers/${id}`);
    }

    return result;
  };

  // Gérer l'annulation
  const handleCancel = () => {
    navigate(isNew ? '/products/suppliers' : `/products/suppliers/${id}`);
  };

  // Préparer les valeurs initiales pour le formulaire
  const getInitialValues = () => {
    if (isNew) {
      return defaultValues;
    }

    if (!supplier) return {};

    // En mode édition, le hook a déjà chargé les données du fournisseur
    return supplier;
  };

  // Rendu conditionnel pour l'onglet images
  const renderImageTab = () => {
    if (activeTab !== 'images' || !supplier) return null;

    return (
      <ImagesTab
        entity={supplier}
        entityId={id}
        entityType="supplier"
        galleryMode={false}
        onUploadImage={handleUploadImage}
        onDeleteImage={handleDeleteImage}
        isLoading={loading}
        error={error}
      />
    );
  };

  return (
    <>
      <EntityForm
        fields={getFormFields()}
        entityName="fournisseur"
        entityNamePlural="fournisseurs"
        isNew={isNew}
        initialValues={getInitialValues()}
        onSubmit={onSubmitForm}
        onCancel={handleCancel}
        isLoading={loading}
        error={error}
        successMessage={success}
        buttonLabel={isNew ? 'Créer le fournisseur' : 'Mettre à jour le fournisseur'}
        formTitle={isNew ? 'Nouveau fournisseur' : `Modifier ${supplier?.name || 'le fournisseur'}`}
        layout="tabs"
        tabs={ENTITY_CONFIG.tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        entityId={id}
        entityType="supplier"
        formIdPrefix="supplier"
      />

      {/* Onglet des images est géré séparément car il ne fait pas partie du formulaire standard */}
      {activeTab === 'images' && !isNew && supplier && (
        <div className="container mx-auto px-4 py-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">{renderImageTab()}</div>
        </div>
      )}
    </>
  );
}

export default SupplierForm;
