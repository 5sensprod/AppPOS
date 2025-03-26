// src/features/products/components/ProductDetail.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useProduct, useProductExtras } from '../stores/productStore';
import { EntityDetail } from '../../../components/common';
import GeneralInfoTab from '../../../components/common/tabs/GeneralInfoTab';
import ProductPriceSection from './ProductPriceSection';
import InventoryTab from './tabs/InventoryTab';
import ImagesTab from '../../../components/common/tabs/ImagesTab';
import WooCommerceTab from '../../../components/common/tabs/WooCommerceTab';
import getValidationSchema from './validationSchema/getValidationSchema';
import { ENTITY_CONFIG } from '../constants';

function ProductDetail() {
  const { id: paramId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const isNew = location.pathname.endsWith('/new');
  const isEditMode = isNew || location.pathname.endsWith('/edit');

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [currentId, setCurrentId] = useState(paramId);

  const { getProductById, createProduct, updateProduct, deleteProduct, syncProduct } = useProduct();
  const { uploadImage, deleteImage, setMainImage } = useProductExtras();

  const validationSchema = getValidationSchema(isNew);

  const defaultValues = {
    name: '',
    sku: '',
    description: '',
    price: null,
    regular_price: null,
    sale_price: null,
    purchase_price: null,
    stock: 0,
    min_stock: null,
    manage_stock: false,
    status: 'draft',
    category_id: null,
    categories: [],
    brand_id: null,
    supplier_id: null,
    category_ref: null,
    categories_refs: [],
    brand_ref: null,
    supplier_ref: null,
  };

  // Chargement du produit lors du premier rendu ou du changement d'ID
  useEffect(() => {
    const effectiveId = currentId || paramId;

    if (isNew) {
      setProduct(defaultValues);
      return;
    }

    if (!effectiveId) return;

    setLoading(true);
    getProductById(effectiveId)
      .then((data) => {
        setProduct(data);
        setError(null);
      })
      .catch((err) => {
        console.error('Erreur de récupération du produit:', err);
        setError(`Erreur lors de la récupération du produit: ${err.message}`);
      })
      .finally(() => setLoading(false));
  }, [currentId, paramId, isNew, getProductById]);

  const handleSubmit = async (data) => {
    setLoading(true);
    setError(null);

    try {
      if (isNew) {
        const created = await createProduct(data);

        // Extraire l'ID de la réponse API (vérifiez la structure exacte)
        // Pour debugging, log la réponse complète
        console.log('Réponse API createProduct:', created);

        // Essayer plusieurs façons possibles d'extraire l'ID
        let newId = null;

        if (created?.id) {
          newId = created.id;
        } else if (created?._id) {
          newId = created._id;
        } else if (created?.data?.id) {
          newId = created.data.id;
        } else if (created?.data?._id) {
          newId = created.data._id;
        } else if (typeof created === 'string') {
          // Si l'API retourne directement l'ID comme string
          newId = created;
        }

        if (!newId) {
          console.error('Réponse API complète:', created);
          throw new Error("L'identifiant du produit créé est introuvable dans la réponse API.");
        }

        // Mettre à jour l'état local avant la redirection
        setCurrentId(newId);

        // Définir le succès
        setSuccess('Produit créé avec succès');

        // Charger les données du produit avant la redirection
        const newProduct = await getProductById(newId);
        setProduct(newProduct);

        // Rediriger après tout le traitement
        navigate(`/products/${newId}`, { replace: true });
      } else {
        const effectiveId = currentId || paramId;
        await updateProduct(effectiveId, data);
        setSuccess('Produit mis à jour avec succès');

        // Recharger le produit mis à jour
        const updated = await getProductById(effectiveId);
        setProduct(updated);
      }
    } catch (err) {
      console.error('Erreur lors de la soumission:', err);
      setError(`Erreur: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setLoading(true);
      const effectiveId = currentId || paramId;
      await deleteProduct(effectiveId);
      navigate('/products');
    } catch (err) {
      setError(`Erreur lors de la suppression: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (isNew) {
      navigate('/products');
    } else {
      const effectiveId = currentId || paramId;
      navigate(`/products/${effectiveId}`);
    }
  };

  const handleUploadImage = async (entityId, file) => {
    try {
      await uploadImage(entityId, file);
      const effectiveId = currentId || paramId;
      const updated = await getProductById(effectiveId);
      setProduct(updated);
    } catch (err) {
      setError(`Erreur upload image: ${err.message}`);
    }
  };

  const handleDeleteImage = async (entityId) => {
    try {
      await deleteImage(entityId);
      const effectiveId = currentId || paramId;
      const updated = await getProductById(effectiveId);
      setProduct(updated);
    } catch (err) {
      setError(`Erreur suppression image: ${err.message}`);
    }
  };

  const handleSetMainImage = async (entityId, imageIndex) => {
    try {
      setLoading(true);
      await setMainImage(entityId, imageIndex);

      const effectiveId = currentId || paramId;
      const updatedProduct = await getProductById(effectiveId);

      setProduct(updatedProduct);
      return true;
    } catch (error) {
      console.error("Erreur lors de la définition de l'image principale:", error);
      setError("Échec de la définition de l'image principale.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const renderTabContent = (entity, activeTab, formProps = {}) => {
    const { editable, register, errors } = formProps;
    switch (activeTab) {
      case 'general':
        return (
          <GeneralInfoTab
            entity={entity}
            fields={['name', 'sku', 'description', 'status']}
            editable={editable}
            additionalSection={
              <ProductPriceSection
                product={entity}
                editable={editable}
                register={register}
                errors={errors}
              />
            }
          />
        );
      case 'inventory':
        return (
          <InventoryTab product={entity} editable={editable} register={register} errors={errors} />
        );
      case 'images':
        return (
          <ImagesTab
            entity={entity}
            entityId={currentId || paramId}
            entityType="product"
            galleryMode={true}
            onUploadImage={handleUploadImage}
            onDeleteImage={handleDeleteImage}
            onSetMainImage={handleSetMainImage}
            isLoading={loading}
            error={error}
          />
        );
      case 'woocommerce':
        return <WooCommerceTab entity={entity} entityType="product" onSync={syncProduct} />;
      default:
        return null;
    }
  };

  const visibleTabs = isNew
    ? ENTITY_CONFIG.tabs.filter((tab) => !['images', 'woocommerce'].includes(tab.id))
    : ENTITY_CONFIG.tabs;

  return (
    <EntityDetail
      entity={product}
      entityId={currentId || paramId}
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
