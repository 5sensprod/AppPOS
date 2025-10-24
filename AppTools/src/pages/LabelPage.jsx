// src/pages/LabelPage.jsx
import React, { useState, useEffect } from 'react';
import ToolsSidebar from '../features/labels/components/ToolsSidebar';
import CanvasArea from '../features/labels/components/CanvasArea';
import TopToolbar from '../features/labels/components/TopToolbar';
import DataSourceSelector from '../features/labels/components/DataSourceSelector';
import ProductSelector from '../features/labels/components/ProductSelector';
import useLabelStore from '../features/labels/store/useLabelStore';

const LabelPage = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showDataSourceSelector, setShowDataSourceSelector] = useState(true);
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [multiSelectProducts, setMultiSelectProducts] = useState(false);

  // État pour stocker le docNode du canvas
  const [docNode, setDocNode] = useState(null);

  const {
    dataSource,
    selectedProduct,
    selectedProducts,
    setDataSource,
    setSelectedProducts,
    clearCanvas,
  } = useLabelStore();

  const handleDataSourceSelect = (source) => {
    setDataSource(source, null);
    setShowDataSourceSelector(false);

    if (source === 'data') {
      setMultiSelectProducts(true); // Activer la sélection multiple
      setShowProductSelector(true);
    }
  };

  const handleProductSelect = (product) => {
    if (Array.isArray(product)) {
      // Mode multi-sélection : ORDRE CRITIQUE !
      // 1. D'abord setDataSource avec le tableau complet (ligne 67 du store le gère)
      setDataSource('data', product);
      // Note : setDataSource gère déjà selectedProducts via la ligne 67
    } else {
      // Mode simple
      setDataSource('data', product);
    }
    setShowProductSelector(false);
  };

  const handleNewLabel = () => {
    clearCanvas();
    setShowDataSourceSelector(true);
    setMultiSelectProducts(false);
  };

  // Pour le passage aux composants enfants: utilise selectedProduct du store
  const displayProduct =
    selectedProduct ||
    (Array.isArray(selectedProducts) && selectedProducts.length > 0 ? selectedProducts[0] : null);

  return (
    <div className="flex flex-col h-[100%] bg-gray-100 dark:bg-gray-900">
      {showDataSourceSelector && (
        <DataSourceSelector
          onSelect={handleDataSourceSelect}
          onClose={() => setShowDataSourceSelector(false)}
        />
      )}

      {showProductSelector && (
        <ProductSelector
          onSelect={handleProductSelect}
          onClose={() => {
            setShowProductSelector(false);
            setShowDataSourceSelector(true);
          }}
          multiSelect={multiSelectProducts}
          selectedProducts={selectedProducts}
        />
      )}

      <TopToolbar dataSource={dataSource} onNewLabel={handleNewLabel} docNode={docNode} />

      <div className="flex flex-1 overflow-hidden">
        <ToolsSidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          dataSource={dataSource}
          selectedProduct={displayProduct}
          docNode={docNode}
        />

        <CanvasArea
          dataSource={dataSource}
          selectedProduct={displayProduct}
          onDocNodeReady={setDocNode}
        />
      </div>
    </div>
  );
};

export default LabelPage;
