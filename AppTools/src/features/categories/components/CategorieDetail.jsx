import React from 'react';
import { useParams } from 'react-router-dom';
import { EntityDetail } from '../../../components/common';
import { ENTITY_CONFIG } from '../constants';
import useCategoryDetail from '../hooks/useCategoryDetail';

function CategorieDetail() {
  const { id: paramId } = useParams();
  const {
    category,
    currentId,
    isNew,
    editable: isEditMode,
    loading,
    error,
    success,
    validationSchema,
    defaultValues,
    handleSubmit,
    handleDelete,
    handleCancel,
    handleSync,
    renderTabContent,
  } = useCategoryDetail();

  const visibleTabs = isNew ? [{ id: 'general', label: 'Général' }] : ENTITY_CONFIG.tabs;

  return (
    <EntityDetail
      entity={category}
      entityId={currentId || paramId}
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
      onSync={handleSync}
      isLoading={loading}
      error={error}
      success={success}
      editable={isEditMode}
      validationSchema={validationSchema}
      defaultValues={defaultValues}
      formTitle={isNew ? 'Nouvelle catégorie' : `Modifier ${category?.name || 'la catégorie'}`}
    />
  );
}

export default CategorieDetail;
