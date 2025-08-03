//AppTools\src\components\common\EntityTable\components\BatchActions\components\ExportModal\components\PresetManager.jsx
import React, { useState } from 'react';
import { Save, FolderOpen, Trash2, Plus, Move } from 'lucide-react';

const PresetManager = ({
  savedPresets,
  loading = false,
  onSavePreset,
  onLoadPreset,
  onDeletePreset,
  title = 'Mes presets',
  emptyMessage = 'Aucun preset sauvegardé',
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!presetName.trim() || saving) return;

    setSaving(true);
    try {
      const result = await onSavePreset(presetName);
      if (result) {
        setPresetName('');
        setIsCreating(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') {
      setIsCreating(false);
      setPresetName('');
    }
  };

  // ✅ Vérifier si un preset contient des positions personnalisées
  const hasCustomPositions = (preset) => {
    const positions = preset.preset_data?.style?.customPositions;
    return positions && Object.keys(positions).length > 0;
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-600 pt-3 mt-3">
      <div className="flex items-center justify-between mb-2">
        <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300">{title}</h5>

        {!isCreating && (
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="text-xs text-blue-600 hover:text-blue-700 flex items-center"
          >
            <Plus className="h-3 w-3 mr-1" />
            Nouveau
          </button>
        )}
      </div>

      {/* Création de preset */}
      {isCreating && (
        <div className="flex gap-1 mb-2">
          <input
            type="text"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Nom du preset..."
            className="flex-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700"
            autoFocus
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={!presetName.trim() || saving}
            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
            ) : (
              <Save className="h-3 w-3" />
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsCreating(false);
              setPresetName('');
            }}
            className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            ✕
          </button>
        </div>
      )}

      {/* Liste des presets */}
      {loading ? (
        <div className="flex items-center justify-center py-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-xs text-gray-500">Chargement...</span>
        </div>
      ) : savedPresets.length > 0 ? (
        <div className="space-y-1 max-h-24 overflow-y-auto">
          {savedPresets.map((preset) => (
            <div
              key={preset._id}
              className="flex items-center justify-between text-xs bg-gray-50 dark:bg-gray-700 rounded px-2 py-1"
            >
              <div className="flex-1 flex flex-col">
                <div className="flex items-center gap-1">
                  <span className="truncate text-gray-700 dark:text-gray-300 font-medium">
                    {preset.name}
                  </span>
                  {/* ✅ NOUVEAU : Indicateur positions personnalisées */}
                  {hasCustomPositions(preset) && (
                    <Move
                      className="h-3 w-3 text-orange-500"
                      title="Contient des positions personnalisées"
                    />
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-500 dark:text-gray-400">
                    {preset.is_public ? '🌐 Public' : '👤 Personnel'}
                  </span>
                  {preset.metadata?.support_type && (
                    <span className="text-gray-500 dark:text-gray-400">
                      📄 {preset.metadata.support_type}
                    </span>
                  )}
                  {/* ✅ NOUVEAU : Détail positions */}
                  {hasCustomPositions(preset) && (
                    <span className="text-orange-600 dark:text-orange-400">
                      📍 Positions custom
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => onLoadPreset(preset._id)}
                  className="text-blue-600 hover:text-blue-700 p-1"
                  title="Charger ce preset"
                >
                  <FolderOpen className="h-3 w-3" />
                </button>
                {!preset.is_public && (
                  <button
                    type="button"
                    onClick={() => onDeletePreset(preset._id)}
                    className="text-red-600 hover:text-red-700 p-1"
                    title="Supprimer ce preset"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-500 italic">{emptyMessage}</p>
      )}
    </div>
  );
};

export default PresetManager;
