// src/features/labels/components/templates/LayersPanel.jsx
import React, { useState } from 'react';
import { Lock, Unlock, Trash2, Copy, Eye, EyeOff, GripVertical } from 'lucide-react';
import useLabelStore from '../../store/useLabelStore';

const LayersPanel = () => {
  const elements = useLabelStore((state) => state.elements);
  const selectedId = useLabelStore((state) => state.selectedId);
  const selectElement = useLabelStore((state) => state.selectElement);
  const updateElement = useLabelStore((state) => state.updateElement);
  const deleteElement = useLabelStore((state) => state.deleteElement);
  const duplicateElement = useLabelStore((state) => state.duplicateElement);
  const moveElement = useLabelStore((state) => state.moveElement);

  const [draggedIndex, setDraggedIndex] = useState(null);

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    moveElement(draggedIndex, index);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const getIcon = (type) => {
    switch (type) {
      case 'text':
        return '📝';
      case 'image':
        return '🖼️';
      case 'shape':
        return '⬛';
      default:
        return '📄';
    }
  };

  if (elements.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        <p className="text-sm">Aucun calque</p>
      </div>
    );
  }

  return (
    <div className="space-y-1 p-2">
      {[...elements].reverse().map((element, index) => {
        const actualIndex = elements.length - 1 - index;
        const isSelected = element.id === selectedId;
        const isLocked = element.locked || false;
        const isVisible = element.visible !== false;

        return (
          <div
            key={element.id}
            draggable={!isLocked}
            onDragStart={(e) => handleDragStart(e, actualIndex)}
            onDragOver={(e) => handleDragOver(e, actualIndex)}
            onDragEnd={handleDragEnd}
            onClick={() => !isLocked && selectElement(element.id)}
            className={`group flex items-center gap-2 px-2 py-2 rounded cursor-pointer transition-all ${
              isSelected ? 'bg-blue-500 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700'
            } ${!isVisible ? 'opacity-50' : ''} ${
              draggedIndex === actualIndex ? 'opacity-50' : ''
            }`}
          >
            {/* Drag handle */}
            {!isLocked && (
              <GripVertical className="h-4 w-4 text-gray-400 cursor-grab active:cursor-grabbing" />
            )}

            {/* Icon + Text */}
            <div className="flex-1 min-w-0 flex items-center gap-2">
              <span className="text-lg">{getIcon(element.type)}</span>
              <span className="text-sm truncate">
                {element.type === 'text' && element.text}
                {element.dataBinding && (
                  <span className="ml-1 text-xs opacity-70">({element.dataBinding})</span>
                )}
              </span>
            </div>

            {/* Actions compactes */}
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  updateElement(element.id, { visible: !isVisible });
                }}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                title={isVisible ? 'Masquer' : 'Afficher'}
              >
                {isVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  updateElement(element.id, { locked: !isLocked });
                }}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                title={isLocked ? 'Déverrouiller' : 'Verrouiller'}
              >
                {isLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  duplicateElement(element.id);
                }}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                title="Dupliquer"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteElement(element.id);
                }}
                className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                title="Supprimer"
              >
                <Trash2 className="h-3.5 w-3.5 text-red-500" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default LayersPanel;
