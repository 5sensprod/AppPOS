import React, { useState, useEffect, useMemo } from 'react';
import { useProduct, useProductDataStore } from '../stores/productStore';
import { EntityTable } from '../../../components/common/';
import { ENTITY_CONFIG } from '../constants';
import { useEntityTable } from '@/hooks/useEntityTable';
import UnifiedFilterBar from '../../../components/common/EntityTable/components/UnifiedFilterBar';
import { useEntityFilter } from '@/hooks/useEntityFilter';
import { usePaginationStore } from '@/stores/usePaginationStore'; // Nouvel import

function ProductTable(props) {
  const { deleteProduct, syncProduct } = useProduct();
  const {
    products,
    loading: productsLoading,
    error: productsError,
    fetchProducts,
    initWebSocket,
  } = useProductDataStore();
  const { sync: syncEnabled } = ENTITY_CONFIG.features;

  // Récupérer les paramètres de pagination persistants
  const { getPaginationParams } = usePaginationStore();
  const { pageSize: persistedPageSize } = getPaginationParams('product');

  const { selectedFilters, setSelectedFilters } = useEntityFilter('product');

  const [localProducts, setLocalProducts] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (syncEnabled) initWebSocket();

    // Charger les produits uniquement au montage initial
    const fetchInitialProducts = async () => {
      if (products.length === 0) {
        await fetchProducts();
      }
    };

    fetchInitialProducts();

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
    loadEntities, // Ajouter cette référence
  } = useEntityTable({
    entityType: 'product',
    // Ne pas inclure fetchEntities ici, car il crée une boucle
    // fetchEntities: fetchProducts,
    deleteEntity: async (id) => {
      console.log(`🗑️ Suppression du produit #${id}`);
      await deleteProduct(id);
      // Après la suppression, charger les données manuellement
      await fetchProducts();
    },
    syncEntity: syncEnabled
      ? async (id) => {
          console.log(`🔄 Début de synchronisation du produit #${id}`);
          try {
            await syncProduct(id);
            console.log(`✅ Fin de synchronisation du produit #${id}`);
            // Après la synchronisation, charger les données manuellement
            await fetchProducts();
          } catch (error) {
            console.error(`❌ Erreur lors de la synchronisation:`, error);
            throw error;
          }
        }
      : undefined,
  });

  const isLoading = productsLoading || operationLoading;

  const filterOptions = useMemo(() => {
    const wooOptions = [
      { label: 'Synchronisé', value: 'woo_synced', type: 'woo' },
      { label: 'Non synchronisé', value: 'woo_unsynced', type: 'woo' },
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

    const categoryOptions = Array.from(
      new Map(
        products
          .flatMap((p) => p.category_info?.refs || [])
          .map((c) => [c.id, { value: `category_${c.id}`, label: c.name, type: 'category' }])
      ).values()
    );

    return [
      ...wooOptions,
      ...imageOptions,
      ...descriptionOptions,
      ...brandOptions,
      ...supplierOptions,
      ...categoryOptions,
    ];
  }, [products]);

  const filteredProducts = useMemo(() => {
    let data = localProducts;

    const wooFilter = selectedFilters.find((f) => f.type === 'woo')?.value;
    const imageFilter = selectedFilters.find((f) => f.type === 'image')?.value;
    const supplierFilters = selectedFilters.filter((f) => f.type === 'supplier');
    const brandFilters = selectedFilters.filter((f) => f.type === 'brand');
    const categoryFilters = selectedFilters.filter((f) => f.type === 'category');
    const descriptionFilter = selectedFilters.find((f) => f.type === 'description')?.value;

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

    if (categoryFilters.length > 0) {
      const categoryIds = categoryFilters.map((f) => f.value.replace('category_', ''));
      data = data.filter(
        (p) =>
          Array.isArray(p.categories) && p.categories.some((catId) => categoryIds.includes(catId))
      );
    }

    if (descriptionFilter === 'has_description') {
      data = data.filter((p) => p.description && p.description.trim() !== '');
    } else if (descriptionFilter === 'no_description') {
      data = data.filter((p) => !p.description || p.description.trim() === '');
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
        syncEnabled={syncEnabled}
        actions={['view', 'edit', 'delete', 'sync']}
        batchActions={['delete', 'sync']}
        onSync={handleSyncEntity}
        pagination={{
          enabled: true,
          pageSize: persistedPageSize || 10, // Utiliser la taille persistante ou la valeur par défaut
          showPageSizeOptions: true,
          pageSizeOptions: [5, 10, 25, 50, 100],
        }}
        defaultSort={ENTITY_CONFIG.defaultSort}
        paginationEntityId="product" // Identifiant unique pour la pagination
        {...props}
      />
    </>
  );
}

export default ProductTable;
