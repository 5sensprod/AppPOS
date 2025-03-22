// src/features/suppliers/components/SupplierDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useSupplier } from '../contexts/supplierContext';
import { EntityDetail } from '../../../components/common';
import GeneralInfoTab from '../../../components/common/tabs/GeneralInfoTab';
import ContactInfoTab from '../../../components/common/tabs/ContactInfoTab';
import PaymentInfoTab from '../../../components/common/tabs/PaymentInfoTab';
import ImagesTab from '../../../components/common/tabs/ImagesTab';
import { ENTITY_CONFIG } from '../constants';

function SupplierDetail() {
  const { id } = useParams();
  const { getSupplierById, deleteSupplier } = useSupplier();

  const [supplier, setSupplier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Charger les données du fournisseur
  useEffect(() => {
    if (!id) return;

    setLoading(true);
    getSupplierById(id)
      .then(setSupplier)
      .catch(() => setError('Erreur lors de la récupération du fournisseur.'))
      .finally(() => setLoading(false));
  }, [id]);

  // Fonctions pour gérer les images (à implémenter selon votre logique)
  const handleUploadImage = () => {};
  const handleDeleteImage = () => {};
  const handleSetMainImage = () => {};

  // Rendu du contenu des onglets avec les nouveaux composants
  const renderTabContent = (supplier, activeTab) => {
    switch (activeTab) {
      case 'general':
        return (
          <GeneralInfoTab entity={supplier} fields={['name', 'supplier_code', 'customer_code']} />
        );
      case 'contact':
        return <ContactInfoTab contact={supplier.contact} />;
      case 'payment':
        return <PaymentInfoTab banking={supplier.banking} paymentTerms={supplier.payment_terms} />;
      case 'images':
        return (
          <ImagesTab
            entity={supplier}
            entityId={id}
            entityType="supplier"
            galleryMode={true}
            onUploadImage={handleUploadImage}
            onDeleteImage={handleDeleteImage}
            onSetMainImage={handleSetMainImage}
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
