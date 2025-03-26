// src/features/brands/components/BrandDetail.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useBrand, useBrandExtras } from '../stores/brandStore';
import { useBrandDataStore } from '../stores/brandStore';
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

  const { getBrandById, createBrand, updateBrand, deleteBrand } = useBrand();
  const { uploadImage, deleteImage, syncBrand } = useBrandExtras();
  const brandWsStore = useBrandDataStore();

  useEffect(() => {
    if (isNew) {
      setBrand({ name: '', description: '', slug: '' });
      return;
    }

    if (!id) return;

    let cleanup = () => {};

    // Initialiser WebSocket si disponible
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
      if (isNew) {
        const { gallery_images, ...cleanData } = data; // ⬅️ on enlève gallery_images
        const created = await createBrand(cleanData);
        const newId = created?.id || created?._id || created?.data?.id || created?.data?._id;
        if (newId) {
          setSuccess('Marque créée avec succès');
          navigate(`/products/brands/${newId}`, { replace: true });
        } else {
          throw new Error("Impossible de récupérer l'ID de la nouvelle marque.");
        }
      } else {
        const { gallery_images, slug, ...sanitizedData } = data;
        await updateBrand(id, sanitizedData);
        const updated = await getBrandById(id);
        setBrand(updated);
        setSuccess('Marque mise à jour avec succès');
      }
    } catch (err) {
      console.error('Erreur:', err);
      setError(`Erreur: ${err.message}`);
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
    const { editable, register, errors } = formProps;
    switch (activeTab) {
      case 'general':
        return (
          <GeneralInfoTab
            entity={brand}
            fields={['name', 'slug', 'description']}
            editable={editable}
            register={register}
            errors={errors}
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
      defaultValues={{ name: '', description: '', slug: '' }}
      formTitle={isNew ? 'Nouvelle marque' : `Modifier ${brand?.name || 'la marque'}`}
    />
  );
}

export default BrandDetail;
