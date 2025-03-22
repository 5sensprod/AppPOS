// src/features/suppliers/SuppliersPage.jsx
import React from 'react';
import { Truck } from 'lucide-react';
import { SupplierProvider } from './contexts/supplierContext';
import SupplierTable from './components/SupplierTable';
import EntityPageLayout from '../../components/common/EntityPageLayout';

function SuppliersPage() {
  return (
    <EntityPageLayout
      icon={<Truck />}
      title="Fournisseurs"
      description="Gérez votre liste de fournisseurs"
      addButtonLabel="Ajouter un fournisseur"
      addButtonPath="/products/suppliers/new"
      provider={SupplierProvider}
      contentComponent={SupplierTable}
    />
  );
}

export default SuppliersPage;
