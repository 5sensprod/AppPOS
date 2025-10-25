// src/pages/LabelPage.jsx
import React, { useState, useEffect, useRef } from 'react';
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
  const stageRef = useRef(null); // 🆕 Ref pour le Stage (pour TemplateManager)

  // 🆕 État pour l'outil sélectionné dans la sidebar
  const [selectedTool, setSelectedTool] = useState(null);

  const {
    dataSource,
    selectedProduct,
    selectedProducts,
    setDataSource,
    setSelectedProducts,
    clearCanvas,
  } = useLabelStore();

  // ✅ Fonction pour ouvrir le panneau Effets
  const handleOpenEffects = () => {
    if (isSidebarCollapsed) {
      setIsSidebarCollapsed(false);
    }
    setSelectedTool('effects');
  };

  const handleDataSourceSelect = (source) => {
    setDataSource(source, null);
    setShowDataSourceSelector(false);

    if (source === 'data') {
      setMultiSelectProducts(true);
      setShowProductSelector(true);
    }
  };

  const handleProductSelect = (product) => {
    if (Array.isArray(product)) {
      setDataSource('data', product);
    } else {
      setDataSource('data', product);
    }
    setShowProductSelector(false);
  };

  const handleNewLabel = () => {
    clearCanvas();
    setShowDataSourceSelector(true);
    setMultiSelectProducts(false);
  };

  // Pour le passage aux composants enfants
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

      {/* 🆕 TopToolbar avec selectedProduct et onOpenEffects */}
      <TopToolbar
        dataSource={dataSource}
        onNewLabel={handleNewLabel}
        docNode={docNode}
        selectedProduct={displayProduct}
        onOpenEffects={handleOpenEffects}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* 🆕 ToolsSidebar avec stageRef pour TemplateManager */}
        <ToolsSidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          dataSource={dataSource}
          selectedProduct={displayProduct}
          selectedTool={selectedTool}
          onToolChange={setSelectedTool}
          docNode={docNode}
          stageRef={stageRef}
        />

        {/* 🆕 CanvasArea avec ref pour le Stage */}
        <CanvasArea
          ref={stageRef}
          dataSource={dataSource}
          selectedProduct={displayProduct}
          onDocNodeReady={setDocNode}
          onOpenEffects={handleOpenEffects}
        />
      </div>
    </div>
  );
};

export default LabelPage;
