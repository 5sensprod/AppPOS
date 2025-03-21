// src/features/brands/components/BrandsTable.jsx
import React, { useEffect } from 'react';
import { useBrand, useBrandExtras } from '../contexts/brandContext';
import EntityTable from '@/components/common/EntityTable/index';
import { ENTITY_CONFIG } from '../constants';
import { useEntityEvents } from '../../../hooks/useEntityEvents';

function BrandsTable(props) {
  const { brands, loading, error, fetchBrands, deleteBrand, dispatch } = useBrand();
  const { syncBrand } = useBrandExtras();

  // Chargement direct des données au montage du composant
  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  // Utilisation du hook useEntityEvents pour écouter les événements WebSocket
  useEntityEvents('brand', {
    onCreated: () => {
      console.log('[WS-DEBUG] Nouvelle marque créée, actualisation de la liste');
      fetchBrands();
    },
    onUpdated: () => {
      console.log('[WS-DEBUG] Marque mise à jour, actualisation de la liste');
      fetchBrands();
    },
    onDeleted: () => {
      console.log('[WS-DEBUG] Marque supprimée, actualisation de la liste');
      fetchBrands();
    },
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
      onDelete={deleteBrand}
      onSync={syncBrand}
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
