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

  // État pour stocker le docNode du canvas
  const [docNode, setDocNode] = useState(null);

  const { dataSource, selectedProduct, setDataSource, clearCanvas } = useLabelStore();

  const handleDataSourceSelect = (source) => {
    setDataSource(source, null);
    setShowDataSourceSelector(false);

    if (source === 'data') {
      setShowProductSelector(true);
    }
  };

  const handleProductSelect = (product) => {
    setDataSource('data', product);
    setShowProductSelector(false);
  };

  const handleNewLabel = () => {
    clearCanvas();
    setShowDataSourceSelector(true);
  };

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
        />
      )}

      <TopToolbar
        dataSource={dataSource}
        selectedProduct={selectedProduct}
        onNewLabel={handleNewLabel}
        docNode={docNode}
      />

      <div className="flex flex-1 overflow-hidden">
        <ToolsSidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          dataSource={dataSource}
          selectedProduct={selectedProduct}
        />

        <CanvasArea
          dataSource={dataSource}
          selectedProduct={selectedProduct}
          onDocNodeReady={setDocNode}
        />
      </div>
    </div>
  );
};

export default LabelPage;
