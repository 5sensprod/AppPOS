// src/features/suppliers/components/SupplierDetail.jsx
import React from 'react';
import { useParams } from 'react-router-dom';
import {
  useSupplier,
  useSupplierExtras,
  useSupplierDataStore,
  useSupplierDetailPreferences,
} from '../stores/supplierStore';
import { EntityDetail } from '../../../components/common';
import GeneralInfoTab from '../../../components/common/tabs/GeneralInfoTab';
import ContactInfoTab from '../../../components/common/tabs/ContactInfoTab';
import PaymentInfoTab from '../../../components/common/tabs/PaymentInfoTab';
import ImagesTab from '../../../components/common/tabs/ImagesTab';
import { ENTITY_CONFIG } from '../constants';
import { useEntityDetailWithPreferences } from '../../../hooks/useEntityDetailWithPreferences';

function SupplierDetail() {
  const { id } = useParams();
  const { getSupplierById, deleteSupplier } = useSupplier();
  const { uploadImage, deleteImage } = useSupplierExtras();
  const supplierDataStore = useSupplierDataStore();
  const supplierDetailPreferences = useSupplierDetailPreferences();

  // Utiliser notre nouveau hook combiné
  const {
    entity: supplier,
    detailPreferences,
    loading,
    error,
    handleUploadImage,
    handleDeleteImage,
    handleTabChange,
    recentlyViewed,
  } = useEntityDetailWithPreferences({
    id,
    entityType: 'supplier',
    entityStore: {
      getEntityById: getSupplierById,
      deleteEntity: deleteSupplier,
      uploadImage,
      deleteImage,
      wsStore: supplierDataStore,
    },
    preferencesStore: supplierDetailPreferences,
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

  // Si nécessaire, ajouter du contenu supplémentaire pour les éléments récemment consultés
  const renderRecentlyViewed = () => {
    if (recentlyViewed && recentlyViewed.length > 0) {
      return (
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h3 className="text-lg font-medium mb-3">Récemment consultés</h3>
          <div className="flex flex-wrap gap-2">
            {/* Afficher les éléments récemment consultés ici */}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <>
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
        // Nouvelles props pour les préférences
        activeTab={detailPreferences.activeTab}
        onTabChange={handleTabChange}
      />
      {renderRecentlyViewed()}
    </>
  );
}

export default SupplierDetail;
