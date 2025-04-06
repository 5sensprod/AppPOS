// src/features/brands/components/BrandsTable.jsx
import React, { useEffect } from 'react';
import { useBrand, useBrandDataStore } from '../stores/brandStore';
import EntityTable from '@/components/common/EntityTable/index';
import { ENTITY_CONFIG } from '../constants';
import { useEntityTable } from '@/hooks/useEntityTable';

function BrandsTable(props) {
  const { deleteBrand, syncBrand } = useBrand();
  const { brands, loading: brandsLoading, fetchBrands, initWebSocket } = useBrandDataStore();
  const { sync: syncEnabled } = ENTITY_CONFIG.features;

  useEffect(() => {
    if (syncEnabled) {
      initWebSocket();
    }
    if (brands.length === 0) {
      fetchBrands();
    }
  }, [initWebSocket, fetchBrands, brands.length, syncEnabled]);

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

  // 🧠 Générer dynamiquement les fournisseurs pour le filtre
  const supplierOptions = Array.from(
    new Map(
      brands
        .flatMap((b) => b.suppliersRefs || [])
        .map((s) => [s.id, { value: s.id, label: s.name }])
    ).values()
  );

  return (
    <EntityTable
      data={brands || []}
      isLoading={isLoading}
      error={error}
      columns={ENTITY_CONFIG.columns}
      entityName="marque"
      entityNamePlural="marques"
      baseRoute="/products/brands"
      filters={[
        {
          id: 'woo_id',
          label: 'Synchronisation WooCommerce',
          type: 'select',
          options: [
            { value: 'synced', label: 'Synchronisé' },
            { value: 'unsynced', label: 'Non synchronisé' },
          ],
          allLabel: 'Tous',
        },
        {
          id: 'suppliers',
          label: 'Fournisseur',
          type: 'select',
          options: supplierOptions,
          allLabel: 'Tous les fournisseurs',
        },
      ]}
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
  );
}

export default BrandsTable;
