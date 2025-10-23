// src/features/labels/components/templates/ShapeTemplates.jsx
import React from 'react';
import { Square, Circle, Triangle, Star } from 'lucide-react';

const ShapeTemplates = () => {
  const shapes = [
    { id: 'rectangle', label: 'Rectangle', icon: Square, color: '#3b82f6' },
    { id: 'circle', label: 'Cercle', icon: Circle, color: '#ef4444' },
    { id: 'triangle', label: 'Triangle', icon: Triangle, color: '#22c55e' },
    { id: 'star', label: 'Étoile', icon: Star, color: '#f59e0b' },
  ];

  return (
    <div className="p-4">
      <div className="grid grid-cols-2 gap-3">
        {shapes.map((shape) => (
          <button
            key={shape.id}
            className="p-6 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all"
          >
            <div className="flex flex-col items-center gap-2">
              <shape.icon className="h-8 w-8" style={{ color: shape.color }} fill={shape.color} />
              <span className="text-xs font-medium">{shape.label}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ShapeTemplates;
