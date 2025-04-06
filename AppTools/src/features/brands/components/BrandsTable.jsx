// src/features/brands/components/BrandsTable.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { useBrand, useBrandDataStore } from '../stores/brandStore';
import EntityTable from '@/components/common/EntityTable/index';
import UnifiedFilterBar from '@/components/common/EntityTable/components/UnifiedFilterBar';
import { ENTITY_CONFIG } from '../constants';
import { useEntityTable } from '@/hooks/useEntityTable';

function BrandsTable(props) {
  const { deleteBrand, syncBrand } = useBrand();
  const { brands, loading: brandsLoading, fetchBrands, initWebSocket } = useBrandDataStore();
  const { sync: syncEnabled } = ENTITY_CONFIG.features;

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
  const [selectedFilters, setSelectedFilters] = useState([]);

  const filterOptions = useMemo(() => {
    const wooOptions = [
      { label: 'Synchronisé WooCommerce', value: 'woo_synced', type: 'woo' },
      { label: 'Non synchronisé WooCommerce', value: 'woo_unsynced', type: 'woo' },
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

    return brands.filter((brand) => {
      return selectedFilters.every((filter) => {
        if (filter.type === 'woo') {
          return filter.value === 'woo_synced' ? brand.woo_id != null : brand.woo_id == null;
        }

        if (filter.type === 'supplier') {
          const supplierId = filter.value.replace('supplier_', '');
          return brand.suppliers?.includes(supplierId);
        }

        return true;
      });
    });
  }, [brands, selectedFilters]);

  return (
    <div className="space-y-4">
      <UnifiedFilterBar
        filterOptions={filterOptions}
        selectedFilters={selectedFilters}
        onChange={setSelectedFilters}
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
          pageSize: 5,
          showPageSizeOptions: true,
          pageSizeOptions: [5, 10, 25, 50],
        }}
        defaultSort={ENTITY_CONFIG.defaultSort}
        {...props}
      />
    </div>
  );
}

export default BrandsTable;
