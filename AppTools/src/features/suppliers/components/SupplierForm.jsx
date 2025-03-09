// src/features/suppliers/components/SupplierForm.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSupplier } from '../contexts/supplierContext';
import { EntityForm, EntityImageManager } from '../../../components/common';
import { ENTITY_CONFIG } from '../constants';
import * as yup from 'yup';

// Schéma de validation pour les fournisseurs
const supplierSchema = yup.object().shape({
  name: yup.string(),
  supplier_code: yup.string(),
  customer_code: yup.string(),
  contact: yup.object().shape({
    name: yup.string(),
    email: yup.string().email('Adresse email invalide'),
    phone: yup.string(),
    address: yup.string(),
  }),
  banking: yup.object().shape({
    iban: yup.string(),
    bic: yup.string(),
  }),
  payment_terms: yup.object().shape({
    type: yup.string(),
    discount: yup
      .number()
      .transform((value) => (isNaN(value) ? undefined : value))
      .min(0, 'La remise doit être positive')
      .max(100, 'La remise ne peut pas dépasser 100%'),
  }),
});

function SupplierForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;

  // Hooks de contexte
  const { getSupplierById, createSupplier, updateSupplier, uploadImage, deleteImage } =
    useSupplier();

  // États locaux
  const [supplier, setSupplier] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('general');

  // Charger les données du fournisseur si on est en mode édition
  useEffect(() => {
    async function loadData() {
      if (!isNew) {
        setLoading(true);
        try {
          const supplierData = await getSupplierById(id);
          setSupplier(supplierData);
          setLoading(false);
        } catch (error) {
          console.error('Erreur lors du chargement du fournisseur:', error);
          setError('Erreur lors du chargement du fournisseur. Veuillez réessayer.');
          setLoading(false);
        }
      }
    }

    loadData();
  }, [isNew, id, getSupplierById]);

  // Valeurs initiales pour le formulaire
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

  // Gestionnaire de soumission du formulaire
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

    console.log('Données brutes du formulaire:', data);

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

    console.log("Données formatées pour l'API:", formattedData);

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

      setLoading(false);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du fournisseur:', error);
      if (error.response) {
        console.error("Détails de l'erreur:", error.response.data);
        setError(`Erreur: ${error.response.data.error || 'Problème lors de la sauvegarde'}`);
      } else {
        setError('Erreur lors de la sauvegarde du fournisseur. Veuillez réessayer.');
      }
      setLoading(false);
    }
  };

  // Gestionnaire d'annulation
  const handleCancel = () => {
    navigate(isNew ? '/products/suppliers' : `/products/suppliers/${id}`);
  };

  // Rendu conditionnel de l'onglet images
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
      {/* Formulaire principal */}
      {(!id || (id && supplier)) && (
        <EntityForm
          fields={ENTITY_CONFIG.formFields}
          entityName="fournisseur"
          schema={supplierSchema}
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
          layout="tabs"
          tabs={ENTITY_CONFIG.tabs}
        />
      )}

      {/* Gestionnaire d'images (affiché uniquement en mode édition) */}
      {!isNew && supplier && renderImageTab()}
    </div>
  );
}

export default SupplierForm;
