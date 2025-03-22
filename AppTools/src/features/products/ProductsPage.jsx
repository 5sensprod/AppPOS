// src/features/products/ProductsPage.jsx
import React from 'react';
import { Package } from 'lucide-react';
import { ProductProvider } from './contexts/productContext';
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
      provider={ProductProvider}
      contentComponent={ProductTable}
    />
  );
}

export default ProductsPage;
