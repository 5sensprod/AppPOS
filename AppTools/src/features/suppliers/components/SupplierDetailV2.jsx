import React, { useEffect } from 'react';
import useSupplierDetailV2 from '../hooks/useSupplierDetailV2';
import EntityDetail from '../../../detail/EntityDetail';

/**
 * Composant SupplierDetail V2 - Version finale config-driven
 *
 * Ce composant utilise la nouvelle architecture atomique avec :
 * - Configuration externalisée (supplierConfig.js)
 * - Options dynamiques injectées automatiquement
 * - Rendu générique via EntityDetail atomique
 * - Système d'images unifié et atomique
 * - Tous les champs passent par FieldRenderer
 */
function SupplierDetailV2() {
  const {
    // Données
    supplier,
    currentId,
    isNew,
    editable,
    loading,
    error,
    success,

    // Special fields pour les options dynamiques (compatible avec l'ancien système)
    specialFields,

    // Handlers
    handleSubmit,
    handleDelete,
    handleCancel,
    uploadImage,
    deleteImage,

    // Validation
    validationSchema,
    defaultValues,
  } = useSupplierDetailV2();

  // 🔥 Passer les fonctions d'images globalement pour FieldRenderer
  useEffect(() => {
    window.uploadEntityImage = uploadImage;
    window.deleteEntityImage = deleteImage;

    return () => {
      delete window.uploadEntityImage;
      delete window.deleteEntityImage;
    };
  }, [uploadImage, deleteImage]);

  // Configuration des tabs selon le mode
  const tabs = isNew
    ? [{ id: 'general', label: 'Général' }]
    : [
        { id: 'general', label: 'Général' },
        { id: 'contact', label: 'Contact' },
        { id: 'payment', label: 'Paiement' },
        { id: 'images', label: 'Images' },
      ];

  // Configuration enrichie pour le nouveau EntityDetail
  const config = {
    entityName: 'fournisseur',
    entityNamePlural: 'fournisseurs',
    baseRoute: '/products/suppliers',
    tabs: tabs,
    actions: {
      edit: true,
      delete: true,
      sync: false,
    },
    defaultValues: defaultValues,
  };

  return (
    <EntityDetail
      // Données de base
      entity={supplier}
      entityId={currentId}
      // Configuration atomique
      config={config}
      // Mode
      editable={editable}
      // Titre dynamique selon le mode
      title={isNew ? 'Nouveau fournisseur' : `Modifier « ${supplier?.name || ''} »`}
      // Handlers
      onSubmit={handleSubmit}
      onDelete={handleDelete}
      onCancel={handleCancel}
      // État
      isLoading={loading}
      error={error}
      success={success}
      // Validation
      validationSchema={validationSchema}
      defaultValues={defaultValues}

      // 🔥 AUCUN renderTabContent - Tout passe par le système atomique
      // Les images, comme tous les autres champs, passent par FieldRenderer
    />
  );
}

export default SupplierDetailV2;
