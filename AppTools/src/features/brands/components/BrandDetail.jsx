// src/features/brands/components/BrandDetail.jsx
import React from 'react';
import { useParams, useLocation } from 'react-router-dom';
import EntityDetail from '../../../components/common/EntityDetail';
import { ENTITY_CONFIG } from '../constants';
import useBrandDetail from '../hooks/useBrandDetail';
import GeneralInfoTab from '../../../components/common/tabs/GeneralInfoTab';
import ImagesTab from '../../../components/common/tabs/ImagesTab';
import WooCommerceTab from '../../../components/common/tabs/WooCommerceTab';

function BrandDetail() {
  const { id } = useParams();
  const location = useLocation();
  const isNew = location.pathname.endsWith('/new');
  const isEditMode = isNew || location.pathname.endsWith('/edit');

  const {
    brand,
    loading,
    error,
    success,
    specialFields,
    handleSubmit,
    handleDelete,
    handleCancel,
    handleSync,
    validationSchema,
    defaultValues,
    uploadImage,
    deleteImage,
  } = useBrandDetail(id, isNew);

  const visibleTabs = isNew ? [{ id: 'general', label: 'Général' }] : ENTITY_CONFIG.tabs;

  const renderTabContent = (entity, activeTab, formProps = {}) => {
    const { editable } = formProps;
    const brand = entity || {};

    switch (activeTab) {
      case 'general':
        return (
          <GeneralInfoTab
            entity={brand}
            fields={['name', 'slug', 'description', 'suppliers']}
            editable={editable}
            additionalSection={null}
            _specialFields={specialFields}
            {...formProps}
          />
        );
      case 'images':
        return (
          <ImagesTab
            entity={brand}
            entityId={id}
            entityType="brand"
            galleryMode={false}
            onUploadImage={uploadImage}
            onDeleteImage={deleteImage}
            isLoading={loading}
            error={error}
            editable={editable}
          />
        );
      case 'woocommerce':
        return (
          <WooCommerceTab
            entity={brand}
            entityType="brand"
            onSync={handleSync}
            editable={editable}
            showStatus={false} // Explicitement cacher le statut pour les marques
          />
        );
      default:
        return null;
    }
  };

  return (
    <EntityDetail
      entity={brand}
      entityId={id}
      entityName="marque"
      entityNamePlural="marques"
      baseRoute="/products/brands"
      tabs={visibleTabs}
      renderTabContent={renderTabContent}
      actions={['edit', 'delete']}
      syncEnabled={ENTITY_CONFIG.syncEnabled}
      onDelete={handleDelete}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      onSync={handleSync}
      isLoading={loading}
      error={error}
      success={success}
      editable={isEditMode}
      validationSchema={validationSchema}
      defaultValues={defaultValues}
    />
  );
}

export default BrandDetail;
