// src/features/suppliers/components/SupplierDetail.jsx
import React from 'react';
import { useParams, useLocation } from 'react-router-dom';
import EntityDetail from '../../../components/common/EntityDetail';
import { ENTITY_CONFIG } from '../constants';
import useSupplierDetail from '../hooks/useSupplierDetail';
import GeneralInfoTab from '../../../components/common/tabs/GeneralInfoTab';
import ContactInfoTab from '../../../components/common/tabs/ContactInfoTab';
import PaymentInfoTab from '../../../components/common/tabs/PaymentInfoTab';
import ImagesTab from '../../../components/common/tabs/ImagesTab';

function SupplierDetail() {
  const { id } = useParams();
  const location = useLocation();
  const isNew = location.pathname.endsWith('/new');
  const isEditMode = isNew || location.pathname.endsWith('/edit');

  const {
    supplier,
    loading,
    error,
    success,
    validationSchema,
    defaultValues,
    handleSubmit,
    handleDelete,
    handleCancel,
    handleUploadImage,
    handleDeleteImage,
    specialFields,
  } = useSupplierDetail(id, isNew);

  const formDefaultValues = {
    ...defaultValues,
    brands: supplier?.brands || [],
  };

  const renderTabContent = (entity, activeTab, formProps = {}) => {
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
    />
  );
}

export default SupplierDetail;
