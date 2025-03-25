// src/features/brands/components/BrandsTable.jsx
import React, { useEffect } from 'react';
import { useBrand, useBrandExtras } from '../stores/brandStore';
import { useBrandDataStore } from '../stores/brandStore';
import EntityTable from '@/components/common/EntityTable/index';
import { ENTITY_CONFIG } from '../constants';
import { useEntityTable } from '@/hooks/useEntityTable';

function BrandsTable(props) {
  const { deleteBrand } = useBrand();
  const { syncBrand } = useBrandExtras();

  // Utiliser le store de données standard (non-hiérarchique)
  const { brands, loading: brandsLoading, fetchBrands, initWebSocket } = useBrandDataStore();

  // Initialiser les WebSockets et charger les données si nécessaire
  useEffect(() => {
    initWebSocket();
    if (brands.length === 0) {
      fetchBrands();
    }
  }, [initWebSocket, fetchBrands, brands.length]);

  // Utilisation du hook useEntityTable sans les abonnements WebSocket
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
      // Le refresh se fera automatiquement via les événements WebSocket
    },
    syncEntity: async (id) => {
      await syncBrand(id);
      // Le refresh se fera automatiquement via les événements WebSocket
    },
  });

  // Combinaison de l'état de chargement du store et des opérations
  const isLoading = brandsLoading || operationLoading;

  // Configuration des filtres si nécessaire
  const filters = [];

  return (
    <EntityTable
      data={brands || []}
      isLoading={isLoading}
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
