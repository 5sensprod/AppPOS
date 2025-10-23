// src/features/labels/components/ToolsSidebar.jsx
import React, { useState } from 'react';
import {
  ChevronLeft,
  Type,
  Image,
  Shapes,
  Table2,
  Layers,
  Maximize2,
  ArrowLeft,
} from 'lucide-react';
import TextTemplates from './templates/TextTemplates';
import ImageTemplates from './templates/ImageTemplates';
import ShapeTemplates from './templates/ShapeTemplates';
import TableTemplates from './templates/TableTemplates';
import LayersPanel from './templates/LayersPanel';
import FormatPanel from './templates/FormatPanel';

const ToolsSidebar = ({ isCollapsed, onToggleCollapse, dataSource, selectedProduct }) => {
  const [selectedTool, setSelectedTool] = useState(null);

  const tools = [
    { id: 'text', label: 'Texte', icon: Type, component: TextTemplates },
    { id: 'image', label: 'Image', icon: Image, component: ImageTemplates },
    { id: 'shape', label: 'Forme', icon: Shapes, component: ShapeTemplates },
    { id: 'table', label: 'Tableau', icon: Table2, component: TableTemplates },
    { id: 'layers', label: 'Calques', icon: Layers, component: LayersPanel },
    { id: 'format', label: 'Format', icon: Maximize2, component: FormatPanel },
  ];

  const handleToolClick = (toolId) => {
    setSelectedTool(toolId === selectedTool ? null : toolId);
  };

  // Mode icônes uniquement
  if (isCollapsed) {
    return (
      <div className="w-16 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col items-center py-4 gap-2">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => {
              onToggleCollapse();
              setSelectedTool(tool.id);
            }}
            className="p-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            title={tool.label}
          >
            <tool.icon className="h-5 w-5" />
          </button>
        ))}
      </div>
    );
  }

  // Mode déplié avec templates
  const SelectedComponent = tools.find((t) => t.id === selectedTool)?.component;

  return (
    <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex">
      {/* Barre d'icônes */}
      <div className="w-16 border-r border-gray-200 dark:border-gray-700 flex flex-col items-center py-4 gap-2">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => handleToolClick(tool.id)}
            className={`p-3 rounded-lg transition-colors ${
              selectedTool === tool.id
                ? 'bg-blue-500 text-white'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            title={tool.label}
          >
            <tool.icon className="h-5 w-5" />
          </button>
        ))}
      </div>

      {/* Zone de templates */}
      <div className="flex-1 flex flex-col">
        {selectedTool ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedTool(null)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <h2 className="font-semibold text-gray-800 dark:text-white">
                  {tools.find((t) => t.id === selectedTool)?.label}
                </h2>
              </div>
              <button
                onClick={onToggleCollapse}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            </div>

            {/* Templates */}
            <div className="flex-1 overflow-y-auto">
              {SelectedComponent && (
                <SelectedComponent dataSource={dataSource} selectedProduct={selectedProduct} />
              )}
            </div>
          </>
        ) : (
          <>
            {/* Header sans sélection */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800 dark:text-white">Sélectionnez un outil</h2>
              <button
                onClick={onToggleCollapse}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 flex items-center justify-center p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                Cliquez sur une icône pour voir les templates disponibles
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ToolsSidebar;
