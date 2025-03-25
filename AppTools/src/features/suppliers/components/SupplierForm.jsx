// src/features/suppliers/components/SupplierForm.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSupplier } from '../stores/supplierStore';
import { EntityForm, EntityImageManager } from '../../../components/common';
import { ENTITY_CONFIG } from '../constants';

function SupplierForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;

  // Hooks Zustand au lieu du context
  const { getSupplierById, createSupplier, updateSupplier, uploadImage, deleteImage } =
    useSupplier();

  // États locaux (inchangés)
  const [supplier, setSupplier] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const hasTabs = ENTITY_CONFIG.tabs && ENTITY_CONFIG.tabs.length > 0;
  const [activeTab, setActiveTab] = useState(hasTabs ? 'general' : null);

  // Charger les données du fournisseur si on est en mode édition
  useEffect(() => {
    if (!id) return;

    setLoading(true);
    getSupplierById(id)
      .then(setSupplier)
      .catch(() => setError('Erreur lors du chargement du fournisseur.'))
      .finally(() => setLoading(false));
  }, [id, getSupplierById]);

  // Valeurs initiales pour le formulaire (inchangé)
  const getInitialValues = () => {
    if (isNew) {
      return {
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
    }

    return supplier || {};
  };

  // Gestionnaire de soumission du formulaire (inchangé)
  const handleSubmit = async (data) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Vérifier si les champs ont été "aplatis" par le formulaire
    const needsRestructuring =
      data['contact.name'] !== undefined ||
      data['banking.iban'] !== undefined ||
      data['payment_terms.type'] !== undefined;

    let formattedData = data;

    // Nettoyage des champs vides (inchangé)
    Object.keys(formattedData).forEach((key) => {
      if (formattedData[key] === '') {
        delete formattedData[key];
      } else if (typeof formattedData[key] === 'object' && formattedData[key] !== null) {
        Object.keys(formattedData[key]).forEach((subKey) => {
          if (formattedData[key][subKey] === '') {
            delete formattedData[key][subKey];
          }
        });
      }
    });

    // Restructurer les données si nécessaire (inchangé)
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

    try {
      if (isNew) {
        await createSupplier(formattedData);
        setSuccess('Fournisseur créé avec succès');
        navigate('/products/suppliers');
      } else {
        await updateSupplier(id, formattedData);
        setSuccess('Fournisseur mis à jour avec succès');
        // Recharger les données du fournisseur
        const updatedSupplier = await getSupplierById(id);
        setSupplier(updatedSupplier);
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du fournisseur:', error);
      if (error.response) {
        console.error("Détails de l'erreur:", error.response.data);
        setError(`Erreur: ${error.response.data.error || 'Problème lors de la sauvegarde'}`);
      } else {
        setError('Erreur lors de la sauvegarde du fournisseur. Veuillez réessayer.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Gestionnaire d'annulation (inchangé)
  const handleCancel = () => {
    navigate(isNew ? '/products/suppliers' : `/products/suppliers/${id}`);
  };

  // Rendu conditionnel de l'onglet images (inchangé)
  const renderImageTab = () => {
    if (activeTab !== 'images' || !supplier) return null;

    return (
      <EntityImageManager
        entity={supplier}
        entityId={id}
        entityType="supplier"
        galleryMode={false}
        onUploadImage={(id, file) => uploadImage(id, file)}
        onDeleteImage={(id) => deleteImage(id)}
        isLoading={loading}
      />
    );
  };

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Formulaire principal (inchangé) */}
      {(!id || (id && supplier)) && (
        <EntityForm
          fields={ENTITY_CONFIG.formFields}
          entityName="fournisseur"
          isNew={isNew}
          initialValues={getInitialValues()}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={loading}
          error={error}
          successMessage={success}
          buttonLabel={isNew ? 'Créer le fournisseur' : 'Mettre à jour le fournisseur'}
          formTitle={
            isNew ? 'Nouveau fournisseur' : `Modifier ${supplier?.name || 'le fournisseur'}`
          }
          layout={hasTabs ? 'tabs' : 'default'}
          tabs={hasTabs ? ENTITY_CONFIG.tabs : []}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      )}

      {/* Gestionnaire d'images (inchangé) */}
      {!isNew && supplier && renderImageTab()}
    </div>
  );
}

export default SupplierForm;
