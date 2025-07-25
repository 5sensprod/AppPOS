import React from 'react';
import { Scissors, FileText, Layers } from 'lucide-react';

const EnhancedCutOptions = ({ currentLayout, onLayoutChange }) => {
  const cutModes = [
    {
      id: 'continuous',
      name: 'Continu',
      description: 'Toutes les étiquettes sur une longue page',
      icon: <FileText className="h-4 w-4" />,
      settings: { cutPerLabel: false, labelsPerGroup: 1 },
    },
    {
      id: 'cut_per_label',
      name: 'Coupe par étiquette',
      description: 'Une page par étiquette (coupure automatique)',
      icon: <Scissors className="h-4 w-4" />,
      settings: { cutPerLabel: true, labelsPerGroup: 1 },
    },
    {
      id: 'groups',
      name: "Groupes d'étiquettes",
      description: 'Plusieurs étiquettes puis coupure',
      icon: <Layers className="h-4 w-4" />,
      settings: { cutPerLabel: false, labelsPerGroup: 3 }, // ✅ Mettre 3 au lieu de currentLayout.labelsPerGroup
    },
  ];

  // Déterminer le mode actuel
  const getCurrentMode = () => {
    console.log('🔍 Détection mode actuel:', {
      cutPerLabel: currentLayout.cutPerLabel,
      labelsPerGroup: currentLayout.labelsPerGroup,
    });

    if (currentLayout.cutPerLabel === true) {
      console.log('✅ Mode détecté: cut_per_label');
      return cutModes.find((m) => m.id === 'cut_per_label');
    }

    // ✅ Changer la condition : si labelsPerGroup existe ET est différent de 1
    if (currentLayout.labelsPerGroup && currentLayout.labelsPerGroup > 1) {
      console.log('✅ Mode détecté: groups');
      return cutModes.find((m) => m.id === 'groups');
    }

    console.log('✅ Mode détecté: continuous (par défaut)');
    return cutModes.find((m) => m.id === 'continuous');
  };

  const currentMode = getCurrentMode() || cutModes[0];

  const handleModeChange = (mode) => {
    console.log('🔄 Changement de mode:', mode.id, mode.settings);

    const newSettings = {
      ...currentLayout,
      ...mode.settings,
    };

    console.log('📤 Nouveaux paramètres:', newSettings);

    // Utiliser la clé spéciale 'cutMode' pour déclencher la logique dans le hook
    onLayoutChange('cutMode', newSettings);
  };

  const handleLabelsPerGroupChange = (value) => {
    onLayoutChange('labelsPerGroup', parseInt(value));
  };

  return (
    <div className="space-y-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
      <div className="flex items-center space-x-2">
        <Scissors className="h-5 w-5 text-blue-600" />
        <h4 className="font-medium text-gray-900 dark:text-gray-100">
          Options de coupure (Rouleau)
        </h4>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {cutModes.map((mode) => (
          <label
            key={mode.id}
            className={`
              flex items-start space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-all
              ${
                currentMode.id === mode.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
              }
            `}
          >
            <input
              type="radio"
              name="cutMode"
              checked={currentMode.id === mode.id}
              onChange={() => handleModeChange(mode)}
              className="mt-1 accent-blue-600"
            />
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                {mode.icon}
                <span className="font-medium text-gray-900 dark:text-gray-100">{mode.name}</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{mode.description}</p>
            </div>
          </label>
        ))}
      </div>

      {/* Options spécifiques pour le mode groupes */}
      {currentMode.id === 'groups' && (
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Nombre d'étiquettes par groupe
          </label>
          <div className="flex items-center space-x-4">
            <input
              type="range"
              min="2"
              max="10"
              value={currentLayout.labelsPerGroup || 3}
              onChange={(e) => handleLabelsPerGroupChange(e.target.value)}
              className="flex-1 accent-blue-600"
            />
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100 min-w-8">
              {currentLayout.labelsPerGroup || 3}
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Chaque groupe sera sur une page séparée
          </p>
        </div>
      )}

      {/* Aperçu de l'effet */}
      <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Résultat attendu :
        </h5>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {currentMode.id === 'continuous' && (
            <div className="flex items-center space-x-2">
              <span>🔗</span>
              <span>Étiquettes continues sur une longue page, pas de coupure automatique</span>
            </div>
          )}
          {currentMode.id === 'cut_per_label' && (
            <div className="flex items-center space-x-2">
              <span>✂️</span>
              <span>Chaque étiquette sur sa propre page, coupure après chaque impression</span>
            </div>
          )}
          {currentMode.id === 'groups' && (
            <div className="flex items-center space-x-2">
              <span>📄</span>
              <span>{currentLayout.labelsPerGroup || 3} étiquettes par page, puis coupure</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedCutOptions;
