import React, { useState, useMemo } from 'react';
import { Save, FolderOpen, Trash2, Plus, Move, Globe, User } from 'lucide-react';

const PresetManager = ({
  savedPresets = [],
  onSavePreset,
  onLoadPreset,
  onDeletePreset,
  title = 'Mes presets',
  emptyMessage = 'Aucun preset sauvegardé',
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);

  // 🆕 Groupement intelligent des presets
  const groupedPresets = useMemo(() => {
    const groups = {
      personal: savedPresets.filter((p) => !p.is_public),
      public: savedPresets.filter((p) => p.is_public),
    };

    // Tri par nom dans chaque groupe
    groups.personal.sort((a, b) => a.name.localeCompare(b.name));
    groups.public.sort((a, b) => a.name.localeCompare(b.name));

    return groups;
  }, [savedPresets]);

  // 🆕 Analyse du contenu des presets
  const analyzePreset = (preset) => {
    const features = [];

    // Vérifier si c'est un preset de style
    if (preset.preset_data?.style) {
      const style = preset.preset_data.style;
      if (style.showName) features.push('Nom');
      if (style.showPrice) features.push('Prix');
      if (style.showBarcode) features.push('Code-barres');
      if (style.showBorder) features.push('Bordure');
      if (style.customPositions && Object.keys(style.customPositions).length > 0) {
        features.push('Positions custom');
      }
    }

    // Vérifier si c'est un preset de layout
    if (preset.preset_data?.supportType) {
      features.push(`Format ${preset.preset_data.supportType.toUpperCase()}`);
      if (preset.preset_data.width && preset.preset_data.height) {
        features.push(`${preset.preset_data.width}×${preset.preset_data.height}mm`);
      }
    }

    return features;
  };

  // 🆕 Handler sauvegarde amélioré
  const handleSave = async () => {
    if (!presetName.trim() || saving) return;

    setSaving(true);
    try {
      const result = await onSavePreset(presetName.trim(), isPublic);
      if (result) {
        setPresetName('');
        setIsCreating(false);
        setIsPublic(false);
      }
    } finally {
      setSaving(false);
    }
  };

  // 🆕 Gestion clavier améliorée
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') {
      setIsCreating(false);
      setPresetName('');
      setIsPublic(false);
    }
  };

  // 🆕 Vérifier si un preset contient des positions personnalisées
  const hasCustomPositions = (preset) => {
    const positions = preset.preset_data?.style?.customPositions;
    return positions && Object.keys(positions).length > 0;
  };

  // 🆕 Rendu d'un preset avec plus d'informations
  const renderPreset = (preset, isPublicPreset = false) => {
    const features = analyzePreset(preset);

    return (
      <div
        key={preset._id}
        className={`flex items-center justify-between text-xs rounded px-2 py-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-600 ${
          isPublicPreset
            ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700'
            : 'bg-gray-50 dark:bg-gray-700'
        }`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-1">
            <span className="truncate text-gray-700 dark:text-gray-300 font-medium">
              {preset.name}
            </span>
            {hasCustomPositions(preset) && (
              <Move
                className="h-3 w-3 text-orange-500 flex-shrink-0"
                title="Contient des positions personnalisées"
              />
            )}
            {isPublicPreset && (
              <Globe className="h-3 w-3 text-blue-500 flex-shrink-0" title="Preset public" />
            )}
          </div>

          {/* 🆕 Affichage des caractéristiques */}
          {features.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-1">
              {features.map((feature, index) => (
                <span
                  key={index}
                  className={`px-1 py-0.5 rounded text-xs ${
                    feature === 'Positions custom'
                      ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                      : isPublicPreset
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-800/30 dark:text-blue-400'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-600 dark:text-gray-300'
                  }`}
                >
                  {feature}
                </span>
              ))}
            </div>
          )}

          {/* 🆕 Métadonnées */}
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            {isPublicPreset ? (
              <span className="flex items-center">
                <Globe className="h-3 w-3 mr-1" />
                Public
              </span>
            ) : (
              <span className="flex items-center">
                <User className="h-3 w-3 mr-1" />
                Personnel
              </span>
            )}
            {preset.metadata?.support_type && <span>📄 {preset.metadata.support_type}</span>}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-1 ml-2">
          <button
            type="button"
            onClick={() => onLoadPreset(preset._id)}
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-800 transition-colors"
            title="Charger ce preset"
          >
            <FolderOpen className="h-3 w-3" />
          </button>
          {!preset.is_public && (
            <button
              type="button"
              onClick={() => onDeletePreset(preset._id)}
              className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1 rounded hover:bg-red-100 dark:hover:bg-red-800 transition-colors"
              title="Supprimer ce preset"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-600 pt-3 mt-3">
      <div className="flex items-center justify-between mb-2">
        <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300">{title}</h5>

        {!isCreating && (
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          >
            <Plus className="h-3 w-3 mr-1" />
            Nouveau
          </button>
        )}
      </div>

      {/* 🆕 Création de preset améliorée */}
      {isCreating && (
        <div className="space-y-2 mb-3 p-2 bg-gray-50 dark:bg-gray-700 rounded border">
          <input
            type="text"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Nom du preset..."
            className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-800"
            autoFocus
          />

          {/* 🆕 Option visibilité */}
          <label className="flex items-center text-xs text-gray-600 dark:text-gray-400">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="mr-2 text-blue-600"
            />
            <Globe className="h-3 w-3 mr-1" />
            Rendre public (visible par tous)
          </label>

          <div className="flex gap-1">
            <button
              type="button"
              onClick={handleSave}
              disabled={!presetName.trim() || saving}
              className="flex-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center transition-colors"
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
              className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 🆕 Liste des presets groupés */}
      <div className="space-y-3 max-h-48 overflow-y-auto">
        {/* Presets personnels */}
        {groupedPresets.personal.length > 0 && (
          <div>
            <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 flex items-center">
              <User className="h-3 w-3 mr-1" />
              Mes presets ({groupedPresets.personal.length})
            </div>
            <div className="space-y-1">
              {groupedPresets.personal.map((preset) => renderPreset(preset, false))}
            </div>
          </div>
        )}

        {/* Presets publics */}
        {groupedPresets.public.length > 0 && (
          <div>
            <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 flex items-center">
              <Globe className="h-3 w-3 mr-1" />
              Presets publics ({groupedPresets.public.length})
            </div>
            <div className="space-y-1">
              {groupedPresets.public.map((preset) => renderPreset(preset, true))}
            </div>
          </div>
        )}

        {/* Message si vide */}
        {savedPresets.length === 0 && (
          <p className="text-xs text-gray-500 italic text-center py-2">{emptyMessage}</p>
        )}
      </div>
    </div>
  );
};

export default PresetManager;
