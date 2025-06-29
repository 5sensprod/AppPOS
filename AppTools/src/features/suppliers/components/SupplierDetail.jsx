// src/features/suppliers/components/SupplierDetail.jsx - MODIFICATION ALTERNATIVE
import React, { useCallback } from 'react';
import useSupplierDetail from '../hooks/useSupplierDetail';
import EntityDetail from '../../../components/common/EntityDetail';
import GeneralInfoTab from '../../../components/common/tabs/GeneralInfoTab';
import ContactInfoTab from '../../../components/common/tabs/ContactInfoTab';
import PaymentInfoTab from '../../../components/common/tabs/PaymentInfoTab';
import ImagesTab from '../../../components/common/tabs/ImagesTab';

function SupplierDetail() {
  const {
    supplier,
    currentId,
    isNew,
    editable,
    loading,
    error,
    success,
    handleSubmit,
    handleDelete,
    handleCancel,
    validationSchema,
    defaultValues,
    uploadImage,
    deleteImage,
    specialFields,
  } = useSupplierDetail();

  const renderTabContent = useCallback(
    (entity, activeTab, formProps = {}) => {
      const { editable, register, control, errors, setValue, watch } = formProps;

      switch (activeTab) {
        case 'general':
          return (
            <GeneralInfoTab
              entity={entity}
              fields={['name', 'supplier_code', 'customer_code', 'brands']}
              editable={editable}
              _specialFields={specialFields}
            />
          );
        case 'contact':
          return <ContactInfoTab contact={entity?.contact || {}} editable={editable} />;
        case 'payment':
          return (
            <PaymentInfoTab
              banking={entity?.banking || {}}
              paymentTerms={entity?.payment_terms || {}}
              editable={editable}
            />
          );
        case 'images':
          return (
            <ImagesTab
              entity={entity}
              entityId={currentId}
              entityType="supplier"
              galleryMode={false}
              // ✅ UTILISER LES HANDLERS DU FORMULAIRE si disponibles (mode édition)
              // Sinon utiliser les handlers originaux (mode lecture)
              onUploadImage={formProps.onUploadImage || uploadImage}
              onDeleteImage={formProps.onDeleteImage || deleteImage}
              isLoading={loading}
              error={error}
              editable={editable}
            />
          );
        default:
          return null;
      }
    },
    [specialFields, uploadImage, deleteImage, currentId, loading, error]
  );

  // Définir la liste des onglets visibles en fonction de l'état de création (COPIE du pattern product)
  let visibleTabs = [];

  if (isNew) {
    // En mode création, afficher uniquement l'onglet Général
    visibleTabs = [{ id: 'general', label: 'Général', icon: 'info' }];
  } else {
    // En mode édition, afficher tous les onglets
    visibleTabs = [
      { id: 'general', label: 'Général', icon: 'info' },
      { id: 'contact', label: 'Contact', icon: 'user' },
      { id: 'payment', label: 'Paiement', icon: 'credit-card' },
      { id: 'images', label: 'Images', icon: 'image' },
    ];
  }

  return (
    <EntityDetail
      entity={supplier}
      entityId={currentId}
      entityName="fournisseur"
      entityNamePlural="fournisseurs"
      baseRoute="/products/suppliers"
      tabs={visibleTabs}
      renderTabContent={renderTabContent}
      actions={['edit', 'delete']}
      syncEnabled={false}
      onDelete={handleDelete}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      onUploadImage={uploadImage}
      onDeleteImage={deleteImage}
      isLoading={loading}
      error={error}
      success={success}
      editable={editable}
      validationSchema={validationSchema}
      defaultValues={defaultValues}
    />
  );
}

export default SupplierDetail;
