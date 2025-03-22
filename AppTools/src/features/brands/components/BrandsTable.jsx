// src/features/brands/components/BrandsTable.jsx
import React, { useEffect } from 'react';
import { useBrand, useBrandExtras } from '../stores/brandStore'; // Import depuis le store Zustand
import EntityTable from '@/components/common/EntityTable/index';
import { ENTITY_CONFIG } from '../constants';
import { useEntityTable } from '@/hooks/useEntityTable';

function BrandsTable(props) {
  const { brands, fetchBrands, deleteBrand, initWebSocketListeners } = useBrand();
  const { syncBrand } = useBrandExtras();

  // Initialiser les écouteurs WebSocket au montage du composant
  useEffect(() => {
    const cleanup = initWebSocketListeners();
    return cleanup;
  }, [initWebSocketListeners]);

  // Utilisation du hook useEntityTable avec gestion automatique des événements standard
  const { loading, error, handleDeleteEntity, handleSyncEntity } = useEntityTable({
    entityType: 'brand',
    fetchEntities: fetchBrands,
    deleteEntity: deleteBrand,
    syncEntity: syncBrand,
  });

  // Configuration des filtres si nécessaire
  const filters = [];

  return (
    <EntityTable
      data={brands || []}
      isLoading={loading}
      error={error}
      columns={ENTITY_CONFIG.columns}
      entityName="marque"
      entityNamePlural="marques"
      baseRoute="/products/brands"
      filters={filters}
      searchFields={['name', 'description']}
      onDelete={handleDeleteEntity}
      onSync={handleSyncEntity}
      syncEnabled={ENTITY_CONFIG.syncEnabled}
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
