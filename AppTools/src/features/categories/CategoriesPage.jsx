// src/features/categories/CategoriesPage.jsx
import React from 'react';
import { Folder } from 'lucide-react';
import { CategoryProvider } from './contexts/categoryContext';
import CategoriesTable from './components/CategoriesTable';
import EntityPageLayout from '../../components/common/EntityPageLayout';

function CategoriesPage() {
  return (
    <EntityPageLayout
      icon={<Folder />}
      title="Catégories"
      description="Gérez vos catégories"
      addButtonLabel="Ajouter une catégorie"
      addButtonPath="/products/categories/new"
      provider={CategoryProvider}
      contentComponent={CategoriesTable}
    />
  );
}

export default CategoriesPage;
