// src/features/suppliers/components/SupplierForm.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, AlertCircle, X } from 'lucide-react';
import { useSupplier, useSupplierExtras } from '../stores/supplierStore';
import { TabNavigation, ActionButton, InfoCard } from '../../../components/ui';
import GeneralInfoTab from '../../../components/common/tabs/GeneralInfoTab';
import ContactInfoTab from '../../../components/common/tabs/ContactInfoTab';
import PaymentInfoTab from '../../../components/common/tabs/PaymentInfoTab';
import ImagesTab from '../../../components/common/tabs/ImagesTab';
import { ENTITY_CONFIG } from '../constants';
import { useEntityForm } from '../../../hooks/useEntityForm';

/**
 * Composant de formulaire pour les fournisseurs
 * Refactorisé pour utiliser la même structure que EntityDetail
 */
function SupplierForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;

  // Hooks Zustand pour les fonctions API
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
    // Vérifier si les champs ont été "aplatis" par le formulaire
    const needsRestructuring =
      data['contact.name'] !== undefined ||
      data['banking.iban'] !== undefined ||
      data['payment_terms.type'] !== undefined;

    let formattedData = { ...data };

    // Restructurer les données si nécessaire
    if (needsRestructuring) {
      formattedData = {
        ...data,
        contact: {
          name: data['contact.name'] || '',
          email: data['contact.email'] || '',
          phone: data['contact.phone'] || '',
          address: data['contact.address'] || '',
        },
        banking: {
          iban: data['banking.iban'] || '',
          bic: data['banking.bic'] || '',
        },
        payment_terms: {
          type: data['payment_terms.type'] || 'immediate',
          discount: parseFloat(data['payment_terms.discount'] || '0'),
        },
      };

      // S'assurer que customer_code n'est jamais vide
      if (!formattedData.customer_code) {
        formattedData.customer_code = 'DEFAULT';
      }

      // Supprimer les propriétés aplaties
      delete formattedData['contact.name'];
      delete formattedData['contact.email'];
      delete formattedData['contact.phone'];
      delete formattedData['contact.address'];
      delete formattedData['banking.iban'];
      delete formattedData['banking.bic'];
      delete formattedData['payment_terms.type'];
      delete formattedData['payment_terms.discount'];
    }

    return formattedData;
  };

  // Utilisation du hook useEntityForm
  const {
    entity: supplier,
    loading,
    error,
    success,
    getInitialValues,
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

  // Gérer la soumission du formulaire
  const onSubmit = async (event) => {
    event.preventDefault();

    // Récupérer les données du formulaire
    const formData = new FormData(event.target);
    const formValues = Object.fromEntries(formData.entries());

    // Soumettre les données
    const result = await handleSubmit(formValues);

    // Rediriger si la création/mise à jour a réussi
    if (result.success) {
      navigate(isNew ? '/products/suppliers' : `/products/suppliers/${id}`);
    }
  };

  // Gérer l'annulation
  const handleCancel = () => {
    navigate(isNew ? '/products/suppliers' : `/products/suppliers/${id}`);
  };

  // Rendu du contenu de l'onglet actif
  const renderTabContent = (supplier, activeTab) => {
    // Adapter pour traiter les valeurs de formulaire
    const formValues = supplier || getInitialValues();

    switch (activeTab) {
      case 'general':
        return (
          <form id="supplierForm" onSubmit={onSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="form-group">
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Nom du fournisseur*
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  defaultValue={formValues.name}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                />
              </div>

              <div className="form-group">
                <label
                  htmlFor="supplier_code"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Code fournisseur
                </label>
                <input
                  type="text"
                  id="supplier_code"
                  name="supplier_code"
                  defaultValue={formValues.supplier_code}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                />
              </div>

              <div className="form-group">
                <label
                  htmlFor="customer_code"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Code client
                </label>
                <input
                  type="text"
                  id="customer_code"
                  name="customer_code"
                  defaultValue={formValues.customer_code}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
            </div>
          </form>
        );

      case 'contact':
        return (
          <form id="supplierForm" onSubmit={onSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="form-group">
                <label
                  htmlFor="contact.name"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Nom du contact
                </label>
                <input
                  type="text"
                  id="contact.name"
                  name="contact.name"
                  defaultValue={formValues.contact?.name}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                />
              </div>

              <div className="form-group">
                <label
                  htmlFor="contact.email"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Email
                </label>
                <input
                  type="email"
                  id="contact.email"
                  name="contact.email"
                  defaultValue={formValues.contact?.email}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                />
              </div>

              <div className="form-group">
                <label
                  htmlFor="contact.phone"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Téléphone
                </label>
                <input
                  type="tel"
                  id="contact.phone"
                  name="contact.phone"
                  defaultValue={formValues.contact?.phone}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                />
              </div>

              <div className="form-group md:col-span-2">
                <label
                  htmlFor="contact.address"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Adresse
                </label>
                <textarea
                  id="contact.address"
                  name="contact.address"
                  rows="3"
                  defaultValue={formValues.contact?.address}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                ></textarea>
              </div>
            </div>
          </form>
        );

      case 'payment':
        return (
          <form id="supplierForm" onSubmit={onSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="form-group">
                <label
                  htmlFor="banking.iban"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  IBAN
                </label>
                <input
                  type="text"
                  id="banking.iban"
                  name="banking.iban"
                  defaultValue={formValues.banking?.iban}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                />
              </div>

              <div className="form-group">
                <label
                  htmlFor="banking.bic"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  BIC
                </label>
                <input
                  type="text"
                  id="banking.bic"
                  name="banking.bic"
                  defaultValue={formValues.banking?.bic}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                />
              </div>

              <div className="form-group">
                <label
                  htmlFor="payment_terms.type"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Conditions de paiement
                </label>
                <select
                  id="payment_terms.type"
                  name="payment_terms.type"
                  defaultValue={formValues.payment_terms?.type || 'immediate'}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="immediate">Immédiat</option>
                  <option value="30days">30 jours</option>
                  <option value="60days">60 jours</option>
                  <option value="90days">90 jours</option>
                </select>
              </div>

              <div className="form-group">
                <label
                  htmlFor="payment_terms.discount"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Remise (%)
                </label>
                <input
                  type="number"
                  id="payment_terms.discount"
                  name="payment_terms.discount"
                  min="0"
                  max="100"
                  step="0.01"
                  defaultValue={formValues.payment_terms?.discount || 0}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
            </div>
          </form>
        );

      case 'images':
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

      default:
        return null;
    }
  };

  // Affichage pendant le chargement
  if (loading && !isNew && !supplier) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Chargement du fournisseur...</p>
        </div>
      </div>
    );
  }

  // Affichage en cas d'erreur
  if (error && !isNew) {
    return (
      <InfoCard variant="danger" title="Une erreur est survenue" icon={AlertCircle}>
        <p>{error}</p>
        <button
          onClick={() => navigate('/products/suppliers')}
          className="mt-4 px-4 py-2 bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200 rounded-md hover:bg-red-200 dark:hover:bg-red-700"
        >
          Retour à la liste des fournisseurs
        </button>
      </InfoCard>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* En-tête */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <button
            onClick={() => navigate(isNew ? '/products/suppliers' : `/products/suppliers/${id}`)}
            className="mr-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {isNew ? 'Nouveau fournisseur' : `Modifier ${supplier?.name || 'le fournisseur'}`}
          </h1>
        </div>

        <div className="flex space-x-3">
          <ActionButton
            type="submit"
            form="supplierForm"
            icon={Save}
            label={isNew ? 'Créer' : 'Enregistrer'}
            variant="primary"
            isLoading={loading}
          />

          <ActionButton onClick={handleCancel} icon={X} label="Annuler" variant="secondary" />
        </div>
      </div>

      {/* Message de succès */}
      {success && (
        <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
          {success}
        </div>
      )}

      {/* Contenu avec onglets */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
        {ENTITY_CONFIG.tabs.length > 1 && (
          <TabNavigation
            tabs={ENTITY_CONFIG.tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        )}

        {/* Contenu des onglets */}
        <div className="p-6">{renderTabContent(supplier, activeTab)}</div>
      </div>
    </div>
  );
}

export default SupplierForm;
