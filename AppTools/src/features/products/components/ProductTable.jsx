import React, { useState, useEffect, useMemo } from 'react';
import { useProduct, useProductDataStore } from '../stores/productStore';
import { useHierarchicalCategories } from '../../../features/categories/stores/categoryHierarchyStore';
import { EntityTable } from '../../../components/common/';
import { ENTITY_CONFIG } from '../constants';
import { useEntityTable } from '@/hooks/useEntityTable';
import UnifiedFilterBar from '../../../components/common/EntityTable/components/UnifiedFilterBar';
import { useEntityFilter } from '@/hooks/useEntityFilter';
import { usePaginationStore } from '@/stores/usePaginationStore';
import exportService from '../../../services/exportService';
import apiService from '../../../services/api';

function ProductTable(props) {
  const { deleteProduct, syncProduct } = useProduct();
  const {
    products,
    loading: productsLoading,
    error: productsError,
    fetchProducts,
    initWebSocket,
    updateProductsStatus,
  } = useProductDataStore();

  // Utiliser le store des catégories hiérarchiques
  const {
    hierarchicalCategories,
    loading: categoriesLoading,
    fetchHierarchicalCategories,
  } = useHierarchicalCategories();

  const { sync: syncEnabled } = ENTITY_CONFIG.features;

  // Récupérer les paramètres de pagination persistants
  const { getPaginationParams } = usePaginationStore();
  const { pageSize: persistedPageSize } = getPaginationParams('product');

  const { selectedFilters, setSelectedFilters } = useEntityFilter('product');

  const [localProducts, setLocalProducts] = useState([]);
  const [error, setError] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    if (syncEnabled) initWebSocket();

    // Charger les produits uniquement au montage initial
    const fetchInitialProducts = async () => {
      if (products.length === 0) {
        await fetchProducts();
      }
    };

    fetchInitialProducts();

    // Charger les catégories hiérarchiques si elles ne sont pas déjà chargées
    if (hierarchicalCategories.length === 0 && !categoriesLoading) {
      fetchHierarchicalCategories();
    }

    // Nettoyage lors du démontage du composant
    return () => {
      // Ajouter ici le code pour fermer le websocket si nécessaire
    };
  }, []);

  useEffect(() => {
    setLocalProducts(products || []);
    setError(productsError);
  }, [products, productsError]);

  const {
    loading: operationLoading,
    handleDeleteEntity,
    handleSyncEntity,
    handleBatchDeleteEntities,
    handleBatchSyncEntities,
    loadEntities,
  } = useEntityTable({
    entityType: 'product',
    deleteEntity: async (id) => {
      console.log(`🗑️ Suppression du produit #${id}`);
      await deleteProduct(id);
      await fetchProducts();
    },
    syncEntity: syncEnabled
      ? async (id) => {
          console.log(`🔄 Début de synchronisation du produit #${id}`);
          try {
            await syncProduct(id);
            console.log(`✅ Fin de synchronisation du produit #${id}`);
            await fetchProducts();
          } catch (error) {
            console.error(`❌ Erreur lors de la synchronisation:`, error);
            throw error;
          }
        }
      : undefined,
    batchDeleteEntities: async (ids) => {
      console.log(`🗑️ Suppression par lot de ${ids.length} produits`);
      for (const id of ids) {
        await deleteProduct(id);
      }
      await fetchProducts();
    },
    batchSyncEntities: syncEnabled
      ? async (ids) => {
          console.log(`🔄 Synchronisation par lot de ${ids.length} produits`);
          const errors = [];
          for (const id of ids) {
            try {
              await syncProduct(id);
              console.log(`✅ Produit #${id} synchronisé avec succès`);
            } catch (error) {
              console.error(`❌ Erreur lors de la synchronisation du produit #${id}:`, error);
              errors.push({ id, error: error.message || String(error) });
            }
          }
          await fetchProducts();

          if (errors.length > 0) {
            console.warn(`⚠️ ${errors.length} erreurs lors de la synchronisation par lot`, errors);
          }
        }
      : undefined,
  });

  const handleExport = async (exportConfig) => {
    try {
      setExportLoading(true);
      const optimizedConfig = { ...exportConfig };
      await exportService.exportProducts(optimizedConfig);
      return true;
    } catch (error) {
      console.error("Erreur lors de l'export:", error);
      setError(`Erreur lors de l'export: ${error.message}`);
      return false;
    } finally {
      setExportLoading(false);
    }
  };

  const handleBatchStatusChange = async (productIds, newStatus) => {
    try {
      console.log(`Modification du statut pour ${productIds.length} produits: ${newStatus}`);
      await updateProductsStatus(productIds, newStatus);
      await fetchProducts();
      return true;
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error);
      setError(`Erreur lors de la mise à jour du statut: ${error.message}`);
      return false;
    }
  };

  // Fonction pour changer la catégorie par lot
  const handleBatchCategoryChange = async (productIds, categoryId) => {
    try {
      console.log(
        `Modification de la catégorie pour ${productIds.length} produits vers la catégorie ${categoryId}`
      );

      // Appel à l'API pour mettre à jour les catégories
      const response = await apiService.post('/api/products/batch-category', {
        productIds,
        categoryId,
      });

      // Vérifier si la réponse est un succès
      if (response.data && response.data.success) {
        console.log(`Catégorie modifiée avec succès: ${response.data.message}`);

        // Recharger les produits après la mise à jour
        await fetchProducts();

        return true;
      } else {
        const errorMessage =
          response.data?.message || 'Erreur lors de la mise à jour des catégories';
        console.warn('Avertissement lors de la mise à jour des catégories:', errorMessage);
        setError(`Avertissement: ${errorMessage}`);

        // Si la mise à jour a partiellement réussi, on recharge quand même
        if (response.data && response.data.success) {
          await fetchProducts();
        }

        return false;
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la catégorie:', error);
      setError(
        `Erreur lors de la mise à jour de la catégorie: ${error.message || 'Erreur inconnue'}`
      );
      return false;
    }
  };

  const isLoading = productsLoading || operationLoading || exportLoading || categoriesLoading;

  // Préparation des options de filtre pour les produits
  const filterOptions = useMemo(() => {
    const wooOptions = [
      { label: 'Synchronisé', value: 'woo_synced', type: 'woo' },
      { label: 'Non synchronisé', value: 'woo_unsynced', type: 'woo' },
    ];

    const statusOptions = [
      { label: 'Publié', value: 'status_published', type: 'status' },
      { label: 'Brouillon', value: 'status_draft', type: 'status' },
      { label: 'Archivé', value: 'status_archived', type: 'status' },
    ];

    const imageOptions = [
      { label: 'Avec image', value: 'has_image', type: 'image' },
      { label: 'Sans image', value: 'no_image', type: 'image' },
    ];

    const descriptionOptions = [
      { label: 'Avec description', value: 'has_description', type: 'description' },
      { label: 'Sans description', value: 'no_description', type: 'description' },
    ];

    const brandOptions = Array.from(
      new Map(
        products
          .map((p) => p.brand_ref)
          .filter(Boolean)
          .map((b) => [b.id, { value: `brand_${b.id}`, label: b.name, type: 'brand' }])
      ).values()
    );

    const supplierOptions = Array.from(
      new Map(
        products
          .map((p) => p.supplier_ref)
          .filter(Boolean)
          .map((s) => [s.id, { value: `supplier_${s.id}`, label: s.name, type: 'supplier' }])
      ).values()
    );

    return [
      ...wooOptions,
      ...statusOptions,
      ...imageOptions,
      ...descriptionOptions,
      ...brandOptions,
      ...supplierOptions,
    ];
  }, [products]);

  // Options de catégories pour le menu déroulant de changement de catégorie par lot
  // Utilisation du store hierarchicalCategories comme dans UnifiedFilterBar
  const categorySelectOptions = useMemo(() => {
    if (!hierarchicalCategories || hierarchicalCategories.length === 0) {
      // Si les catégories hiérarchiques ne sont pas encore chargées,
      // utiliser les catégories des produits comme fallback
      const categoriesFromProducts = new Map();

      products.forEach((product) => {
        if (product.category_info && Array.isArray(product.category_info.refs)) {
          product.category_info.refs.forEach((cat) => {
            if (cat.id && cat.name) {
              categoriesFromProducts.set(cat.id, {
                value: cat.id,
                label: cat.path_string || cat.name,
              });
            }
          });
        }
      });

      return Array.from(categoriesFromProducts.values()).sort((a, b) =>
        a.label.localeCompare(b.label)
      );
    }

    // Fonction récursive pour transformer les catégories hiérarchiques en liste plate
    const transform = (cats, path = '') => {
      return cats.flatMap((cat) => [
        {
          value: cat._id,
          label: path ? `${path} > ${cat.name}` : cat.name,
        },
        ...(cat.children && cat.children.length > 0
          ? transform(cat.children, path ? `${path} > ${cat.name}` : cat.name)
          : []),
      ]);
    };

    return transform(hierarchicalCategories).sort((a, b) => a.label.localeCompare(b.label));
  }, [hierarchicalCategories, products]);

  const filteredProducts = useMemo(() => {
    let data = localProducts;

    const wooFilter = selectedFilters.find((f) => f.type === 'woo')?.value;
    const imageFilter = selectedFilters.find((f) => f.type === 'image')?.value;
    const supplierFilters = selectedFilters.filter((f) => f.type === 'supplier');
    const brandFilters = selectedFilters.filter((f) => f.type === 'brand');
    const categoryFilters = selectedFilters.filter((f) => f.type === 'category');
    const descriptionFilter = selectedFilters.find((f) => f.type === 'description')?.value;
    const statusFilter = selectedFilters.find((f) => f.type === 'status')?.value;

    if (wooFilter === 'woo_synced') {
      data = data.filter((p) => p.woo_id != null);
    } else if (wooFilter === 'woo_unsynced') {
      data = data.filter((p) => p.woo_id == null);
    }

    const hasImage = (p) =>
      p.image?.url || (Array.isArray(p.gallery_images) && p.gallery_images.length > 0);
    if (imageFilter === 'has_image') {
      data = data.filter(hasImage);
    } else if (imageFilter === 'no_image') {
      data = data.filter((p) => !hasImage(p));
    }

    if (supplierFilters.length > 0) {
      const supplierIds = supplierFilters.map((f) => f.value.replace('supplier_', ''));
      data = data.filter((p) => supplierIds.includes(p.supplier_id));
    }

    if (brandFilters.length > 0) {
      const brandIds = brandFilters.map((f) => f.value.replace('brand_', ''));
      data = data.filter((p) => brandIds.includes(p.brand_id));
    }

    // Filtrage amélioré pour les catégories hiérarchiques
    if (categoryFilters.length > 0) {
      const categoryIds = categoryFilters.map((f) => f.value.replace('category_', ''));

      // Fonction pour vérifier si un produit appartient à une catégorie
      const productInCategory = (product, categoryId) => {
        // Vérifier la catégorie principale
        if (product.category_id === categoryId) return true;

        // Vérifier les catégories additionnelles
        if (Array.isArray(product.categories) && product.categories.includes(categoryId))
          return true;

        // Vérifier dans les category_info.refs si disponible
        if (product.category_info?.refs) {
          return product.category_info.refs.some((ref) => ref.id === categoryId);
        }

        return false;
      };

      data = data.filter((p) => categoryIds.some((catId) => productInCategory(p, catId)));
    }

    if (descriptionFilter === 'has_description') {
      data = data.filter((p) => p.description && p.description.trim() !== '');
    } else if (descriptionFilter === 'no_description') {
      data = data.filter((p) => !p.description || p.description.trim() === '');
    }

    // Filtrage par statut
    if (statusFilter) {
      const status = statusFilter.replace('status_', '');
      data = data.filter((p) => p.status === status);
    }

    return data;
  }, [localProducts, selectedFilters]);

  return (
    <>
      <UnifiedFilterBar
        filterOptions={filterOptions}
        selectedFilters={selectedFilters}
        onChange={setSelectedFilters}
      />

      <EntityTable
        data={filteredProducts}
        isLoading={isLoading}
        error={error}
        columns={ENTITY_CONFIG.columns}
        entityName="produit"
        entityNamePlural="produits"
        baseRoute="/products"
        searchFields={['name', 'sku', 'designation', 'category']}
        onDelete={handleDeleteEntity}
        onBatchDelete={handleBatchDeleteEntities}
        syncEnabled={syncEnabled}
        actions={['view', 'edit', 'delete', ...(syncEnabled ? ['sync'] : [])]}
        batchActions={['delete', ...(syncEnabled ? ['sync'] : []), 'export', 'status', 'category']} // Ajout de 'category'
        onSync={handleSyncEntity}
        onBatchSync={handleBatchSyncEntities}
        onExport={handleExport}
        onBatchStatusChange={handleBatchStatusChange}
        onBatchCategoryChange={handleBatchCategoryChange}
        categoryOptions={categorySelectOptions}
        pagination={{
          enabled: true,
          pageSize: persistedPageSize || 10,
          showPageSizeOptions: true,
          pageSizeOptions: [5, 10, 25, 50, 100],
        }}
        defaultSort={ENTITY_CONFIG.defaultSort}
        paginationEntityId="product"
        externalActiveFilters={selectedFilters}
        {...props}
      />
    </>
  );
}

export default ProductTable;
