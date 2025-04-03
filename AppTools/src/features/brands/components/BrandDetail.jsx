// src/features/brands/components/BrandDetail.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useBrand, useBrandExtras } from '../stores/brandStore';
import { useBrandDataStore } from '../stores/brandStore';
import { useSupplier } from '../../suppliers/stores/supplierStore';
import { EntityDetail } from '../../../components/common';
import GeneralInfoTab from '../../../components/common/tabs/GeneralInfoTab';
import ImagesTab from '../../../components/common/tabs/ImagesTab';
import WooCommerceTab from '../../../components/common/tabs/WooCommerceTab';
import { ENTITY_CONFIG } from '../constants';
import getValidationSchema from './validationSchema/getValidationSchema';

function BrandDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const isNew = location.pathname.endsWith('/new');
  const isEditMode = isNew || location.pathname.endsWith('/edit');

  const [brand, setBrand] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [specialFields, setSpecialFields] = useState({
    supplier_id: { options: [] },
  });

  const { getBrandById, createBrand, updateBrand, deleteBrand } = useBrand();
  const { uploadImage, deleteImage, syncBrand } = useBrandExtras();
  const brandWsStore = useBrandDataStore();

  const supplierStore = useSupplier();
  const { fetchSuppliers } = supplierStore;

  // Charger les options de fournisseur
  useEffect(() => {
    const loadSuppliers = async () => {
      try {
        const response = await fetchSuppliers();
        const data = response?.data || [];

        if (Array.isArray(data)) {
          const supplierOptions = data.map((supplier) => ({
            value: supplier._id || supplier.id,
            label: supplier.name,
          }));

          setSpecialFields((prev) => ({
            ...prev,
            supplier_id: { options: supplierOptions },
          }));
        } else {
          console.error('Les données de fournisseurs ne sont pas un tableau:', data);
        }
      } catch (err) {
        console.error('Erreur lors du chargement des fournisseurs:', err);
      }
    };

    loadSuppliers();
  }, [fetchSuppliers]);

  useEffect(() => {
    if (isNew) {
      setBrand({ name: '', description: '', slug: '', suppliers: [] });
      return;
    }

    if (!id) return;

    let cleanup = () => {};

    if (brandWsStore && brandWsStore.initWebSocket) {
      console.log(`[DETAIL] Initialisation WebSocket pour brand #${id}`);
      cleanup = brandWsStore.initWebSocket();
    }

    setLoading(true);
    getBrandById(id)
      .then((data) => {
        setBrand(data);
        setError(null);
      })
      .catch((err) => {
        console.error('Erreur lors de la récupération de la marque:', err);
        setError(`Erreur lors de la récupération de la marque: ${err.message}`);
      })
      .finally(() => setLoading(false));

    return cleanup;
  }, [id, isNew, getBrandById, brandWsStore]);

  const handleSubmit = async (data) => {
    setLoading(true);
    setError(null);

    try {
      // Extraire uniquement les champs autorisés selon le schéma Joi
      // et préparer les données conformes au schéma
      const { supplier_id, ...otherFields } = data;

      const cleanedData = {
        name: otherFields.name || '',
        description: otherFields.description || null,
        slug: otherFields.slug || null,
        suppliers: supplier_id ? [supplier_id] : [],
      };

      console.log('Données nettoyées à soumettre:', cleanedData);

      if (isNew) {
        const created = await createBrand(cleanedData);
        const newId = created?.id || created?._id || created?.data?.id || created?.data?._id;
        if (newId) {
          setSuccess('Marque créée avec succès');
          navigate(`/products/brands/${newId}`, { replace: true });
        } else {
          throw new Error("Impossible de récupérer l'ID de la nouvelle marque.");
        }
      } else {
        await updateBrand(id, cleanedData);
        const updated = await getBrandById(id);
        setBrand(updated);
        setSuccess('Marque mise à jour avec succès');
      }
    } catch (err) {
      console.error('Erreur:', err);

      if (err.response) {
        console.error("Détails de l'erreur:", err.response.data);
        setError(`Erreur: ${err.message}. Détails: ${JSON.stringify(err.response.data)}`);
      } else {
        setError(`Erreur: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate(isNew ? '/products/brands' : `/products/brands/${id}`);
  };

  const handleSync = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      await syncBrand(id);
      const updated = await getBrandById(id);
      setBrand(updated);
      setSuccess('Marque synchronisée avec succès');
    } catch (error) {
      console.error('Erreur lors de la synchronisation:', error);
      setError('Erreur lors de la synchronisation de la marque');
    } finally {
      setLoading(false);
    }
  };

  const renderTabContent = (brand, activeTab, formProps = {}) => {
    const { editable } = formProps;

    // Convertir et préparer les données pour l'affichage
    let modifiedBrand = brand;
    if (brand) {
      // Pour le mode édition, convertir suppliers en supplier_id
      if (editable) {
        modifiedBrand = {
          ...brand,
          supplier_id: brand.suppliers && brand.suppliers.length > 0 ? brand.suppliers[0] : '',
        };
      }
      // Pour le mode lecture, ajouter supplier_ref basé sur suppliers
      else {
        // Trouver le fournisseur correspondant dans les options
        let supplierName = 'Aucun';
        if (brand.suppliersRefs && brand.suppliersRefs.length > 0) {
          supplierName = brand.suppliersRefs[0].name;
        } else if (brand.suppliers && brand.suppliers.length > 0) {
          const supplierId = brand.suppliers[0];
          const supplierOption = specialFields.supplier_id?.options?.find(
            (s) => s.value === supplierId
          );
          if (supplierOption) {
            supplierName = supplierOption.label;
          }
        }

        modifiedBrand = {
          ...brand,
          supplier_ref: { name: supplierName },
        };
      }
    }

    switch (activeTab) {
      case 'general':
        return (
          <GeneralInfoTab
            entity={modifiedBrand}
            fields={['name', 'slug', 'description', 'supplier_id']}
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
          />
        );
      case 'woocommerce':
        return <WooCommerceTab entity={brand} entityType="brand" onSync={handleSync} />;
      default:
        return null;
    }
  };

  const visibleTabs = isNew ? [{ id: 'general', label: 'Général' }] : ENTITY_CONFIG.tabs;

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
      onDelete={deleteBrand}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      onSync={handleSync}
      isLoading={loading}
      error={error}
      success={success}
      editable={isEditMode}
      validationSchema={getValidationSchema(isNew)}
      defaultValues={{
        name: '',
        description: '',
        slug: '',
        supplier_id: '',
      }}
      formTitle={isNew ? 'Nouvelle marque' : `Modifier ${brand?.name || 'la marque'}`}
    />
  );
}

export default BrandDetail;
