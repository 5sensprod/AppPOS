import React, { useState } from 'react';
import { Settings, Monitor, Printer, ChevronDown, ChevronRight, Cog, Info } from 'lucide-react';
import LCDConfigPage from './LCDConfigPage';
import PrinterConfigPage from './PrinterConfigPage';

const SettingsPage = () => {
  const [expandedSections, setExpandedSections] = useState({
    lcd: false,
    printer: false,
  });

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const sections = [
    {
      id: 'lcd',
      title: 'Écran LCD Client',
      icon: <Monitor className="w-6 h-6" />,
      description: "Configuration de l'affichage client 2 lignes x 20 caractères",
      component: LCDConfigPage,
      color: 'blue',
    },
    {
      id: 'printer',
      title: 'Imprimante POS',
      icon: <Printer className="w-6 h-6" />,
      description: "Configuration de l'imprimante de tickets et reçus",
      component: PrinterConfigPage,
      color: 'green',
    },
  ];

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* En-tête principal */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center space-x-3">
            <Settings className="w-8 h-8 text-gray-600 dark:text-gray-300" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Paramètres Périphériques
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-1">
                Configuration des écrans et imprimantes POS
              </p>
            </div>
          </div>
        </div>

        {/* Accordéon des sections */}
        <div className="space-y-4">
          {sections.map((section) => {
            const isExpanded = expandedSections[section.id];
            const Component = section.component;

            return (
              <div
                key={section.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden"
              >
                {/* En-tête de section cliquable */}
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset transition-colors duration-200"
                >
                  <div className="flex items-center space-x-4">
                    <div
                      className={`p-2 rounded-lg bg-${section.color}-100 text-${section.color}-600 dark:bg-${section.color}-900/30 dark:text-${section.color}-400`}
                    >
                      {section.icon}
                    </div>
                    <div className="text-left">
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {section.title}
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {section.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    )}
                  </div>
                </button>

                {/* Contenu de la section */}
                {isExpanded && (
                  <div className="border-t border-gray-200 dark:border-gray-700">
                    <div className="p-0">
                      <Component />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Section d'informations générales */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <Info className="w-6 h-6 text-blue-500 mt-0.5" />
            <div className="text-sm text-blue-800 dark:text-blue-300">
              <h3 className="font-semibold mb-3">Informations générales</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Écran LCD Client</h4>
                  <ul className="space-y-1 text-xs list-disc list-inside">
                    <li>Compatible avec écrans 2x20 caractères</li>
                    <li>Connexion série (COM1, COM2, etc.)</li>
                    <li>Configuration baud rate flexible</li>
                    <li>Messages POS prédéfinis</li>
                    <li>Conversion automatique des accents</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Imprimante POS</h4>
                  <ul className="space-y-1 text-xs list-disc list-inside">
                    <li>Support papier 58mm, 80mm, 110mm</li>
                    <li>Détection automatique des imprimantes POS</li>
                    <li>Retour à la ligne intelligent</li>
                    <li>Contrôle précis des marges et polices</li>
                    <li>Impression de tickets complets</li>
                    <li>Fallback automatique pour compatibilité</li>
                  </ul>
                </div>
              </div>
              <div className="mt-4 p-3 bg-blue-100 dark:bg-blue-800/30 rounded-md">
                <p className="text-xs">
                  <strong>Note importante :</strong> Ces périphériques nécessitent une connexion
                  directe à votre poste de travail. Assurez-vous que les pilotes appropriés sont
                  installés et que les ports série/USB sont disponibles.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions rapides */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
            <div className="flex items-center space-x-3 mb-3">
              <Cog className="w-5 h-5 text-gray-500" />
              <h3 className="font-medium text-gray-900 dark:text-white">Actions rapides</h3>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => {
                  setExpandedSections({
                    lcd: true,
                    printer: true,
                  });
                }}
                className="w-full text-left px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors"
              >
                Ouvrir toutes les sections
              </button>
              <button
                onClick={() => {
                  setExpandedSections({
                    lcd: false,
                    printer: false,
                  });
                }}
                className="w-full text-left px-3 py-2 text-sm bg-gray-50 text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
              >
                Fermer toutes les sections
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
            <div className="flex items-center space-x-3 mb-3">
              <Info className="w-5 h-5 text-gray-500" />
              <h3 className="font-medium text-gray-900 dark:text-white">Statut système</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Plateforme</span>
                <span className="font-medium">Windows</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">PowerShell</span>
                <span className="font-medium text-green-600">Disponible</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">API Backend</span>
                <span className="font-medium text-green-600">Connecté</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
