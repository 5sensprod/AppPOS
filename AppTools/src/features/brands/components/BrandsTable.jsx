import React, { useEffect } from 'react';
import { useBrand } from '../stores/brandStore';
import { useBrandDataStore } from '../stores/brandStore';
import EntityTable from '@/components/common/EntityTable/index';
import { ENTITY_CONFIG } from '../constants';
import { useEntityTable } from '@/hooks/useEntityTable';

function BrandsTable(props) {
  const { deleteBrand, syncBrand } = useBrand();

  const { brands, loading: brandsLoading, fetchBrands, initWebSocket } = useBrandDataStore();

  const { sync: syncEnabled } = ENTITY_CONFIG.features;

  // Initialiser les WebSockets uniquement si le sync est activé
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
      // Pas besoin de refetch si WebSocket actif
    },
    syncEntity: syncEnabled
      ? async (id) => {
          await syncBrand(id);
          // Pas besoin de refetch si WebSocket actif
        }
      : undefined,
  });

  const isLoading = brandsLoading || operationLoading;

  return (
    <EntityTable
      data={brands || []}
      isLoading={isLoading}
      error={error}
      columns={ENTITY_CONFIG.columns}
      entityName="marque"
      entityNamePlural="marques"
      baseRoute="/products/brands"
      filters={[]}
      searchFields={['name', 'description']}
      onDelete={handleDeleteEntity}
      onSync={syncEnabled ? handleSyncEntity : undefined}
      syncEnabled={syncEnabled}
      actions={['view', 'edit', 'delete', ...(syncEnabled ? ['sync'] : [])]}
      batchActions={['delete', ...(syncEnabled ? ['sync'] : [])]}
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
