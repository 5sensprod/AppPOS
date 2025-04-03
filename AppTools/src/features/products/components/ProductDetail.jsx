import React from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { EntityDetail } from '../../../components/common';
import useProductDetail from '../hooks/useProductDetail';

function ProductDetail() {
  const { id: paramId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const isNew = location.pathname.endsWith('/new');
  const isEditMode = isNew || location.pathname.endsWith('/edit');

  const {
    product,
    loading,
    error,
    success,
    renderTabContent,
    handleSubmit,
    handleDelete,
    handleCancel,
    handleSync,
    validationSchema,
    defaultValues,
    visibleTabs,
  } = useProductDetail({
    paramId,
    navigate,
    isNew,
  });

  return (
    <EntityDetail
      entity={product}
      entityId={paramId}
      entityName="produit"
      entityNamePlural="produits"
      baseRoute="/products"
      tabs={visibleTabs}
      renderTabContent={renderTabContent}
      actions={['edit', 'delete']}
      syncEnabled={true}
      onDelete={handleDelete}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      onSync={handleSync}
      isLoading={loading}
      title={isNew ? 'Ajouter un produit' : `Modifier « ${product?.name || ''} »`}
      error={error}
      success={success}
      editable={isEditMode}
      validationSchema={validationSchema}
      defaultValues={defaultValues}
    />
  );
}

export default ProductDetail;
