// src/features/suppliers/components/SupplierDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useSupplier } from '../contexts/supplierContext';
import { EntityDetail, EntityImageManager } from '../../../components/common';
import { ENTITY_CONFIG } from '../constants';
import { Mail, Phone, Building, MapPin, CreditCard, Calendar } from 'lucide-react';

function SupplierDetail() {
  const { id } = useParams();
  const { getSupplierById, deleteSupplier } = useSupplier();

  const [supplier, setSupplier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Charger les données du fournisseur
  useEffect(() => {
    const fetchSupplier = async () => {
      try {
        setLoading(true);
        const supplierData = await getSupplierById(id);
        setSupplier(supplierData);
        setLoading(false);
      } catch (error) {
        console.error('Erreur lors de la récupération du fournisseur:', error);
        setError('Erreur lors de la récupération du fournisseur. Veuillez réessayer.');
        setLoading(false);
      }
    };

    fetchSupplier();
  }, [id, getSupplierById]);

  // Rendu du contenu des onglets
  const renderTabContent = (supplier, activeTab) => {
    switch (activeTab) {
      case 'general':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                Informations générales
              </h2>

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Nom</h3>
                  <p className="mt-1 text-gray-900 dark:text-gray-100">{supplier.name}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Code fournisseur
                  </h3>
                  <p className="mt-1 text-gray-900 dark:text-gray-100">
                    {supplier.supplier_code || '-'}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Code client
                  </h3>
                  <p className="mt-1 text-gray-900 dark:text-gray-100">
                    {supplier.customer_code || '-'}
                  </p>
                </div>
              </div>
            </div>

            <div>
              {supplier.image && supplier.image.src && (
                <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-sm">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Logo
                  </h3>
                  <EntityImageManager
                    entity={supplier}
                    entityId={id}
                    entityType="supplier"
                    galleryMode={false}
                    singleImageDisplay={supplier.image.src}
                    isLoading={false}
                  />
                </div>
              )}
            </div>
          </div>
        );

      case 'contact':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                Informations de contact
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {supplier.contact && (
                  <>
                    {supplier.contact.name && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
                          <Building className="h-4 w-4 mr-1" /> Nom du contact
                        </h3>
                        <p className="mt-1 text-gray-900 dark:text-gray-100">
                          {supplier.contact.name}
                        </p>
                      </div>
                    )}

                    {supplier.contact.email && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
                          <Mail className="h-4 w-4 mr-1" /> Email
                        </h3>
                        <p className="mt-1 text-gray-900 dark:text-gray-100">
                          <a
                            href={`mailto:${supplier.contact.email}`}
                            className="text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            {supplier.contact.email}
                          </a>
                        </p>
                      </div>
                    )}

                    {supplier.contact.phone && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
                          <Phone className="h-4 w-4 mr-1" /> Téléphone
                        </h3>
                        <p className="mt-1 text-gray-900 dark:text-gray-100">
                          <a
                            href={`tel:${supplier.contact.phone}`}
                            className="text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            {supplier.contact.phone}
                          </a>
                        </p>
                      </div>
                    )}

                    {supplier.contact.address && (
                      <div className="md:col-span-2">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
                          <MapPin className="h-4 w-4 mr-1" /> Adresse
                        </h3>
                        <p className="mt-1 text-gray-900 dark:text-gray-100 whitespace-pre-line">
                          {supplier.contact.address}
                        </p>
                      </div>
                    )}
                  </>
                )}

                {(!supplier.contact || Object.keys(supplier.contact).length === 0) && (
                  <p className="text-gray-500 dark:text-gray-400 col-span-2">
                    Aucune information de contact disponible
                  </p>
                )}
              </div>
            </div>
          </div>
        );

      case 'payment':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                Informations de paiement
              </h2>

              {supplier.banking || supplier.payment_terms ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {supplier.banking && (
                    <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-sm">
                      <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                        <CreditCard className="h-5 w-5 mr-2" /> Informations bancaires
                      </h3>

                      <div className="space-y-3">
                        {supplier.banking.iban && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                              IBAN
                            </h4>
                            <p className="mt-1 text-gray-900 dark:text-gray-100 font-mono">
                              {supplier.banking.iban}
                            </p>
                          </div>
                        )}

                        {supplier.banking.bic && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                              BIC/SWIFT
                            </h4>
                            <p className="mt-1 text-gray-900 dark:text-gray-100 font-mono">
                              {supplier.banking.bic}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {supplier.payment_terms && (
                    <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-sm">
                      <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                        <Calendar className="h-5 w-5 mr-2" /> Conditions de paiement
                      </h3>

                      <div className="space-y-3">
                        {supplier.payment_terms.type && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                              Délai de paiement
                            </h4>
                            <p className="mt-1 text-gray-900 dark:text-gray-100">
                              {supplier.payment_terms.type === 'immediate'
                                ? 'Immédiat'
                                : supplier.payment_terms.type === '30days'
                                  ? '30 jours'
                                  : supplier.payment_terms.type === '60days'
                                    ? '60 jours'
                                    : supplier.payment_terms.type === '90days'
                                      ? '90 jours'
                                      : supplier.payment_terms.type}
                            </p>
                          </div>
                        )}

                        {supplier.payment_terms.discount !== undefined && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                              Remise
                            </h4>
                            <p className="mt-1 text-gray-900 dark:text-gray-100">
                              {supplier.payment_terms.discount}%
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">
                  Aucune information de paiement disponible
                </p>
              )}
            </div>
          </div>
        );

      case 'images':
        return (
          <EntityImageManager
            entity={supplier}
            entityId={id}
            entityType="supplier"
            galleryMode={true}
            onUploadImage={() => {}}
            onDeleteImage={() => {}}
            isLoading={false}
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
