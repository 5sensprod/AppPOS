// src/features/suppliers/components/SupplierDetail.jsx
import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useSupplier, useSupplierExtras } from '../stores/supplierStore'; // Import depuis le store Zustand
import { EntityDetail } from '../../../components/common';
import GeneralInfoTab from '../../../components/common/tabs/GeneralInfoTab';
import ContactInfoTab from '../../../components/common/tabs/ContactInfoTab';
import PaymentInfoTab from '../../../components/common/tabs/PaymentInfoTab';
import ImagesTab from '../../../components/common/tabs/ImagesTab';
import { ENTITY_CONFIG } from '../constants';
import { useEntityDetail } from '../../../hooks/useEntityDetail';

function SupplierDetail() {
  const { id } = useParams();
  const { getSupplierById, deleteSupplier, initWebSocketListeners } = useSupplier();
  const { uploadImage, deleteImage } = useSupplierExtras();

  // Initialiser les écouteurs WebSocket au montage du composant
  useEffect(() => {
    const cleanup = initWebSocketListeners();
    return cleanup;
  }, [initWebSocketListeners]);

  // Utiliser le hook personnalisé pour gérer les détails du fournisseur
  const {
    entity: supplier,
    loading,
    error,
    handleUploadImage,
    handleDeleteImage,
  } = useEntityDetail({
    id,
    entityType: 'supplier',
    getEntityById: getSupplierById,
    uploadImage,
    deleteImage,
  });

  // Rendu du contenu des onglets
  const renderTabContent = (supplier, activeTab) => {
    switch (activeTab) {
      case 'general':
        return (
          <GeneralInfoTab entity={supplier} fields={['name', 'supplier_code', 'customer_code']} />
        );
      case 'contact':
        return <ContactInfoTab contact={supplier?.contact} />;
      case 'payment':
        return (
          <PaymentInfoTab banking={supplier?.banking} paymentTerms={supplier?.payment_terms} />
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
      onDelete={deleteSupplier}
      isLoading={loading}
      error={error}
    />
  );
}

export default SupplierDetail;
