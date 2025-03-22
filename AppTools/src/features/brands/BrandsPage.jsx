// src/features/brands/BrandsPage.jsx
import React from 'react';
import { Tag } from 'lucide-react';
import BrandsTable from './components/BrandsTable';
import EntityPageLayout from '../../components/common/EntityPageLayout';

function BrandsPage() {
  return (
    <EntityPageLayout
      icon={<Tag />}
      title="Marques"
      description="Gérez vos marques de produits"
      addButtonLabel="Ajouter une marque"
      addButtonPath="/products/brands/new"
      // Plus besoin de Provider avec Zustand
      contentComponent={BrandsTable}
    />
  );
}

export default BrandsPage;
