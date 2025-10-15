// AppTools\src\components\common\EntityTable\components\BatchActions\components\ExportLabels\components\PresetManagerCompact.jsx
import React, { useState } from 'react';
import {
  Save,
  FolderOpen,
  Trash2,
  Plus,
  Globe,
  User,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useLabelExportStore } from '../stores/useLabelExportStore';

const PresetManagerCompact = () => {
  const { savedPresets, managePresets } = useLabelExportStore();

  const [isExpanded, setIsExpanded] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!presetName.trim() || saving) return;

    setSaving(true);
    try {
      const result = await managePresets('save', { name: presetName.trim(), isPublic });
      if (result) {
        setPresetName('');
        setIsCreating(false);
        setIsPublic(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleLoad = async (presetId) => {
    await managePresets('apply', { id: presetId });
  };

  const handleDelete = async (presetId) => {
    if (confirm('Supprimer ce preset ?')) {
      await managePresets('delete', { id: presetId });
    }
  };

  const groupedPresets = {
    personal: savedPresets?.filter((p) => !p.is_public) || [],
    public: savedPresets?.filter((p) => p.is_public) || [],
  };

  const totalPresets = savedPresets?.length || 0;

  return (
    <div className="p-4">
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-left mb-3"
      >
        <div className="flex items-center gap-2">
          <Save className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Presets</span>
          {totalPresets > 0 && (
            <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
              {totalPresets}
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-500" />
        )}
      </button>

      {isExpanded && (
        <div className="space-y-3">
          {/* Bouton nouveau preset */}
          {!isCreating && (
            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className="w-full px-3 py-2 text-xs text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded flex items-center justify-center gap-2 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Nouveau preset
            </button>
          )}

          {/* Formulaire création */}
          {isCreating && (
            <div className="space-y-2 p-3 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
              <input
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave();
                  if (e.key === 'Escape') {
                    setIsCreating(false);
                    setPresetName('');
                    setIsPublic(false);
                  }
                }}
                placeholder="Nom du preset..."
                className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-800"
                autoFocus
              />

              <label className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="mr-2 text-blue-600"
                />
                <Globe className="h-3 w-3 mr-1" />
                Rendre public
              </label>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!presetName.trim() || saving}
                  className="flex-1 px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center transition-colors"
                >
                  {saving ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
                  ) : (
                    <>
                      <Save className="h-3 w-3 mr-1" />
                      Sauvegarder
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setPresetName('');
                    setIsPublic(false);
                  }}
                  className="px-3 py-1.5 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Liste des presets */}
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {/* Presets personnels */}
            {groupedPresets.personal.length > 0 && (
              <div>
                <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 flex items-center">
                  <User className="h-3 w-3 mr-1" />
                  Mes presets ({groupedPresets.personal.length})
                </div>
                <div className="space-y-1">
                  {groupedPresets.personal.map((preset) => (
                    <div
                      key={preset._id}
                      className="flex items-center justify-between text-xs rounded px-2 py-2 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    >
                      <span className="truncate flex-1 text-gray-700 dark:text-gray-300 font-medium">
                        {preset.name}
                      </span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => handleLoad(preset._id)}
                          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-800 transition-colors"
                          title="Charger"
                        >
                          <FolderOpen className="h-3.5 w-3.5" />
                        </button>
                        {!preset.is_factory && (
                          <button
                            type="button"
                            onClick={() => handleDelete(preset._id)}
                            className="text-red-600 hover:text-red-700 dark:text-red-400 p-1 rounded hover:bg-red-100 dark:hover:bg-red-800 transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Presets publics */}
            {groupedPresets.public.length > 0 && (
              <div>
                <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 flex items-center">
                  <Globe className="h-3 w-3 mr-1" />
                  Presets publics ({groupedPresets.public.length})
                </div>
                <div className="space-y-1">
                  {groupedPresets.public.map((preset) => (
                    <div
                      key={preset._id}
                      className="flex items-center justify-between text-xs rounded px-2 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                    >
                      <div className="flex items-center gap-1 flex-1 min-w-0">
                        <Globe className="h-3 w-3 text-blue-500 flex-shrink-0" />
                        <span className="truncate text-gray-700 dark:text-gray-300 font-medium">
                          {preset.name}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleLoad(preset._id)}
                        className="text-blue-600 hover:text-blue-700 dark:text-blue-400 p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-800 transition-colors"
                        title="Charger"
                      >
                        <FolderOpen className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Message si vide */}
            {totalPresets === 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 italic text-center py-3">
                Aucun preset sauvegardé
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PresetManagerCompact;
