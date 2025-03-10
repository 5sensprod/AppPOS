// src/features/products/components/ProductImageManager.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { EntityImageManager } from '../../../components/common';
import { useProduct, useProductExtras } from '../contexts/productContext';
import { ArrowLeft } from 'lucide-react';
import websocketService from '../../../services/websocketService';

function ProductImageManager() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getProductById } = useProduct();
  const { uploadImage, uploadGalleryImage, deleteImage, deleteGalleryImage, setMainImage } =
    useProductExtras();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Charger les données du produit
  useEffect(() => {
    const loadProduct = async () => {
      setLoading(true);
      try {
        const data = await getProductById(id);
        setProduct(data);
      } catch (err) {
        setError('Erreur lors du chargement du produit');
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [id, getProductById]);

  useEffect(() => {
    // S'abonner aux mises à jour de produits
    if (websocketService.isConnected) {
      websocketService.subscribe('products');
    }

    // Gestionnaire pour les mises à jour de produits
    const handleProductUpdate = ({ entityId, data }) => {
      if (entityId === id) {
        setProduct(data);
      }
    };

    websocketService.on('products_updated', handleProductUpdate);

    return () => {
      websocketService.off('products_updated', handleProductUpdate);
    };
  }, [id, websocketService.isConnected]);

  // Gestionnaire pour l'upload d'image
  const handleUploadImage = async (productId, file, isGallery = false) => {
    try {
      setLoading(true);
      if (isGallery) {
        await uploadGalleryImage(productId, file);
      } else {
        await uploadImage(productId, file);
      }
      // Recharger le produit pour avoir les dernières images
      const updatedProduct = await getProductById(id);
      setProduct(updatedProduct);
      return true;
    } catch (error) {
      console.error("Erreur lors de l'upload d'image:", error);
      setError("Erreur lors de l'upload d'image");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Gestionnaire pour la suppression d'image
  const handleDeleteImage = async (productId, imageIndex, isGallery = false) => {
    try {
      setLoading(true);
      if (isGallery) {
        await deleteGalleryImage(productId, imageIndex);
      } else {
        await deleteImage(productId);
      }
      // Recharger le produit pour avoir les dernières images
      const updatedProduct = await getProductById(id);
      setProduct(updatedProduct);
      return true;
    } catch (error) {
      console.error("Erreur lors de la suppression d'image:", error);
      setError("Erreur lors de la suppression d'image");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Gestionnaire pour définir l'image principale
  const handleSetMainImage = async (productId, imageIndex) => {
    try {
      setLoading(true);
      await setMainImage(productId, imageIndex);
      // Recharger le produit pour avoir les dernières images
      const updatedProduct = await getProductById(id);
      setProduct(updatedProduct);
      return true;
    } catch (error) {
      console.error("Erreur lors de la définition de l'image principale:", error);
      setError("Erreur lors de la définition de l'image principale");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  if (loading && !product) {
    return <div className="p-4">Chargement...</div>;
  }

  if (error && !product) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => navigate(`/products/${id}`)}
                className="mr-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                Gestion des images: {product?.name || 'Produit'}
              </h3>
            </div>
          </div>
        </div>

        <div className="p-6">
          {product && (
            <EntityImageManager
              entity={product}
              entityId={id}
              entityType="product"
              galleryMode={true}
              onUploadImage={handleUploadImage}
              onDeleteImage={handleDeleteImage}
              onSetMainImage={handleSetMainImage}
              isLoading={loading}
              error={error}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default ProductImageManager;
