// src/features/products/ProductsPage.jsx
import React from 'react';
import { Package } from 'lucide-react';
import ProductTable from './components/ProductTable';
import EntityPageLayout from '../../components/common/EntityPageLayout';

function ProductsPage() {
  return (
    <EntityPageLayout
      icon={<Package />}
      title="Produits"
      description="Gérez votre catalogue de produits"
      addButtonLabel="Ajouter un produit"
      addButtonPath="/products/new"
      contentComponent={ProductTable}
    />
  );
}

export default ProductsPage;
