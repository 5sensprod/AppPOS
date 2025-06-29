// src/features/categories/components/CategorieDetail.jsx
import React, { useCallback } from 'react';
import EntityDetail from '../../../components/common/EntityDetail';
import GeneralInfoTab from '../../../components/common/tabs/GeneralInfoTab';
import ImagesTab from '../../../components/common/tabs/ImagesTab';
import WooCommerceTab from '../../../components/common/tabs/WooCommerceTab';
import HierarchicalParentSelector from '../../../components/common/HierarchicalParentSelector';
import { Controller } from 'react-hook-form';
import { ENTITY_CONFIG } from '../constants';
import useCategoryDetail from '../hooks/useCategoryDetail';

function CategorieDetail() {
  const {
    category,
    currentId,
    isNew,
    editable,
    parentCategories,
    hierarchicalCategories,
    handleSubmit,
    handleDelete,
    handleCancel,
    handleSync,
    handleUploadImage,
    handleDeleteImage,
    validationSchema,
    defaultValues,
    loading,
    error,
    success,
  } = useCategoryDetail();

  const renderTabContent = useCallback(
    (entity, activeTab, formProps = {}) => {
      const { editable, register, control, errors } = formProps;
      const id = currentId;

      switch (activeTab) {
        case 'general':
          return editable ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                {/* Infos générales */}
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Nom</label>
                    <input {...register('name')} className="w-full input" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <textarea {...register('description')} className="w-full input" />
                  </div>
                </div>
              </div>

              <div>
                {/* Parent */}
                <label className="text-sm font-medium">Catégorie parente</label>
                {control && (
                  <Controller
                    name="parent_id"
                    control={control}
                    render={({ field }) => (
                      <HierarchicalParentSelector
                        hierarchicalData={hierarchicalCategories}
                        value={field.value}
                        onChange={field.onChange}
                        currentCategoryId={isNew ? null : id}
                        placeholder="Sélectionner une catégorie parent"
                      />
                    )}
                  />
                )}
                <div className="mt-4">
                  <input type="checkbox" {...register('is_featured')} />
                  <label className="ml-2">Catégorie mise en avant</label>
                </div>
              </div>
            </div>
          ) : (
            <GeneralInfoTab
              entity={entity}
              fields={['name', 'description', 'parent_id']}
              productCount={entity?.productCount || 0}
              editable={false}
            />
          );

        case 'images':
          return (
            <ImagesTab
              entity={entity}
              entityId={id}
              entityType="category"
              galleryMode={false}
              // ✅ CORRIGER : utiliser les handlers du hook
              onUploadImage={formProps.onUploadImage || handleUploadImage}
              onDeleteImage={formProps.onDeleteImage || handleDeleteImage}
              isLoading={loading}
              error={error}
              editable={editable}
            />
          );

        case 'woocommerce':
          return (
            <WooCommerceTab
              entity={entity}
              entityType="category"
              onSync={handleSync}
              editable={editable}
              showStatus={false}
              enableTitleGeneration={false}
            />
          );

        default:
          return null;
      }
    },
    [
      currentId,
      hierarchicalCategories,
      isNew,
      handleUploadImage,
      handleDeleteImage,
      handleSync,
      loading,
      error,
    ]
  );

  const visibleTabs = isNew ? [{ id: 'general', label: 'Général' }] : ENTITY_CONFIG.tabs;

  return (
    <EntityDetail
      entity={category}
      entityId={currentId}
      entityName="catégorie"
      entityNamePlural="catégories"
      baseRoute="/products/categories"
      tabs={visibleTabs}
      renderTabContent={renderTabContent}
      actions={['edit', 'delete']}
      syncEnabled={ENTITY_CONFIG.syncEnabled}
      onDelete={handleDelete}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      // ✅ CORRIGER : utiliser les handlers du hook
      onUploadImage={handleUploadImage}
      onDeleteImage={handleDeleteImage}
      onSync={handleSync}
      isLoading={loading}
      error={error}
      success={success}
      editable={editable}
      validationSchema={validationSchema}
      defaultValues={defaultValues}
      title={isNew ? 'Nouvelle catégorie' : `Modifier « ${category?.name || ''} »`}
    />
  );
}

export default CategorieDetail;
