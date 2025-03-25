// src/features/suppliers/components/SupplierDetail.jsx
import React from 'react';
import { useParams } from 'react-router-dom';
import { useSupplier, useSupplierExtras } from '../stores/supplierStore';
import { useSupplierDataStore } from '../stores/supplierStore';
import { EntityDetail } from '../../../components/common';
import GeneralInfoTab from '../../../components/common/tabs/GeneralInfoTab';
import ContactInfoTab from '../../../components/common/tabs/ContactInfoTab';
import PaymentInfoTab from '../../../components/common/tabs/PaymentInfoTab';
import ImagesTab from '../../../components/common/tabs/ImagesTab';
import { ENTITY_CONFIG } from '../constants';
import { useEntityDetail } from '../../../hooks/useEntityDetail';

function SupplierDetail() {
  const { id } = useParams();
  const { getSupplierById, deleteSupplier } = useSupplier();
  const { uploadImage, deleteImage } = useSupplierExtras();

  // Store WebSocket dédié
  const supplierWsStore = useSupplierDataStore();

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
    wsStore: supplierWsStore,
    uploadImage,
    deleteImage,
  });

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
