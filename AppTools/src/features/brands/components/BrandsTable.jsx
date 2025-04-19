// src/features/brands/components/BrandsTable.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { useBrand, useBrandDataStore } from '../stores/brandStore';
import EntityTable from '@/components/common/EntityTable/index';
import UnifiedFilterBar from '@/components/common/EntityTable/components/UnifiedFilterBar';
import { ENTITY_CONFIG } from '../constants';
import { useEntityTable } from '@/hooks/useEntityTable';
import { useEntityFilter } from '@/hooks/useEntityFilter';
import { usePaginationStore } from '@/stores/usePaginationStore';

function BrandsTable(props) {
  const { deleteBrand, syncBrand } = useBrand();
  const { brands, loading: brandsLoading, fetchBrands, initWebSocket } = useBrandDataStore();
  const { sync: syncEnabled } = ENTITY_CONFIG.features;

  // Récupérer les paramètres de pagination persistants
  const { getPaginationParams } = usePaginationStore();
  const { pageSize: persistedPageSize } = getPaginationParams('brand');

  const {
    loading: operationLoading,
    error,
    handleDeleteEntity,
    handleSyncEntity,
  } = useEntityTable({
    entityType: 'brand',
    fetchEntities: fetchBrands,
    deleteEntity: async (id) => {
      await deleteBrand(id);
    },
    syncEntity: syncEnabled
      ? async (id) => {
          await syncBrand(id);
        }
      : undefined,
  });

  const isLoading = brandsLoading || operationLoading;

  useEffect(() => {
    if (syncEnabled) initWebSocket();
    if (brands.length === 0) fetchBrands();
  }, [initWebSocket, fetchBrands, brands.length, syncEnabled]);

  // 👇 Unified filtering logic
  const { selectedFilters, setSelectedFilters } = useEntityFilter('brand');

  const filterOptions = useMemo(() => {
    const wooOptions = [
      { label: 'Synchronisé', value: 'woo_synced', type: 'woo' },
      { label: 'Non synchronisé', value: 'woo_unsynced', type: 'woo' },
    ];

    const supplierOptions = Array.from(
      new Map(
        brands
          .flatMap((b) => b.suppliersRefs || [])
          .map((s) => [s.id, { value: `supplier_${s.id}`, label: s.name, type: 'supplier' }])
      ).values()
    );

    return [...wooOptions, ...supplierOptions];
  }, [brands]);

  const filteredBrands = useMemo(() => {
    if (selectedFilters.length === 0) return brands;

    const wooFilters = selectedFilters.filter((f) => f.type === 'woo');
    const supplierFilters = selectedFilters.filter((f) => f.type === 'supplier');

    return brands.filter((brand) => {
      // 🌀 Woo filter : doit passer tous les woo_filters
      const wooOk = wooFilters.every((filter) => {
        return filter.value === 'woo_synced' ? brand.woo_id != null : brand.woo_id == null;
      });

      // 🌀 Supplier filter : au moins un des suppliers doit être présent
      const supplierOk =
        supplierFilters.length === 0 ||
        supplierFilters.some((filter) => {
          const supplierId = filter.value.replace('supplier_', '');
          return brand.suppliers?.includes(supplierId);
        });

      return wooOk && supplierOk;
    });
  }, [brands, selectedFilters]);

  return (
    <div className="space-y-4">
      <UnifiedFilterBar
        filterOptions={filterOptions}
        selectedFilters={selectedFilters}
        onChange={setSelectedFilters}
        enableCategories={false}
        enableStatusFilter={false}
      />

      <EntityTable
        data={filteredBrands}
        isLoading={isLoading}
        error={error}
        columns={ENTITY_CONFIG.columns}
        entityName="marque"
        entityNamePlural="marques"
        baseRoute="/products/brands"
        searchFields={['name', 'description']}
        onDelete={handleDeleteEntity}
        onSync={handleSyncEntity}
        syncEnabled={syncEnabled}
        actions={['view', 'edit', 'delete', 'sync']}
        batchActions={['delete', 'sync']}
        pagination={{
          enabled: true,
          pageSize: persistedPageSize || 5,
          showPageSizeOptions: true,
          pageSizeOptions: [5, 10, 25, 50],
        }}
        defaultSort={ENTITY_CONFIG.defaultSort}
        paginationEntityId="brand"
        {...props}
      />
    </div>
  );
}

export default BrandsTable;
