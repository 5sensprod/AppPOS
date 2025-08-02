// AppTools/src/pages/PrinterConfigPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  Printer,
  Upload,
  Eye,
  Settings,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Save,
  Info,
} from 'lucide-react';
import brotherService from '../services/brotherService';

const PrinterConfigPage = () => {
  // États pour les données
  const [loading, setLoading] = useState(false);
  const [printers, setPrinters] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [settings, setSettings] = useState({});
  const [healthStatus, setHealthStatus] = useState(null);
  const [templateInfo, setTemplateInfo] = useState(null);

  // États pour le formulaire
  const [selectedPrinter, setSelectedPrinter] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [templateData, setTemplateData] = useState(
    '{\n  "objCompany": "Ma Société",\n  "Code à barres5": "1234567890123"\n}'
  );
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);

  // États pour les modales
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [templateObjectsModal, setTemplateObjectsModal] = useState({
    visible: false,
    template: null,
  });

  // États pour les messages
  const [message, setMessage] = useState({ type: '', text: '' });

  // Référence pour upload
  const fileInputRef = useRef(null);

  // Chargement initial
  useEffect(() => {
    loadInitialData();
  }, []);

  // Fonction pour afficher les messages
  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const loadInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadHealthStatus(), loadPrinters(), loadTemplates(), loadSettings()]);
    } catch (error) {
      showMessage('error', 'Erreur lors du chargement des données');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Fonctions de chargement des données
  const loadHealthStatus = async () => {
    try {
      const result = await brotherService.checkHealth();
      if (result.success) {
        setHealthStatus(result.data);
      } else {
        setHealthStatus(result.data || { status: 'error', error: 'Erreur connexion' });
      }
    } catch (error) {
      console.error('Erreur health check:', error);
      setHealthStatus({ status: 'error', error: error.message, bridgeAvailable: false });
    }
  };

  const loadPrinters = async () => {
    try {
      const result = await brotherService.getPrinters();
      if (result.success) {
        setPrinters(result.data.printers || []);
        if (result.data.defaultPrinter) {
          setSelectedPrinter(result.data.defaultPrinter);
        }
      } else {
        showMessage('error', 'Erreur chargement imprimantes');
      }
    } catch (error) {
      console.error('Erreur chargement imprimantes:', error);
      showMessage('error', error.message);
    }
  };

  const loadTemplates = async () => {
    try {
      const result = await brotherService.getTemplates();
      if (result.success) {
        setTemplates(result.data || []);
      } else {
        showMessage('error', 'Erreur chargement templates');
      }
    } catch (error) {
      console.error('Erreur chargement templates:', error);
      showMessage('error', error.message);
    }
  };

  const loadSettings = async () => {
    try {
      const result = await brotherService.getSettings();
      if (result.success) {
        setSettings(result.data || {});
        if (result.data.defaultPrinter) {
          setSelectedPrinter(result.data.defaultPrinter);
        }
        if (result.data.defaultTemplate) {
          setSelectedTemplate(result.data.defaultTemplate);
        }
      } else {
        showMessage('error', 'Erreur chargement paramètres');
      }
    } catch (error) {
      console.error('Erreur chargement paramètres:', error);
      showMessage('error', error.message);
    }
  };

  // Fonctions d'actions
  const handleUploadTemplate = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const result = await brotherService.uploadTemplate(file);
      if (result.success) {
        showMessage('success', result.data.message || 'Template uploadé avec succès');
        await loadTemplates();
      } else {
        throw new Error(result.message || 'Erreur upload');
      }
    } catch (error) {
      showMessage('error', error.message);
    }

    // Reset input
    event.target.value = '';
  };

  const handlePreview = async () => {
    if (!selectedTemplate || !templateData.trim()) {
      showMessage('warning', 'Sélectionnez un template et remplissez les données');
      return;
    }

    setPreviewLoading(true);
    try {
      const parsedData = JSON.parse(templateData);
      const result = await brotherService.generatePreview(selectedTemplate, parsedData, {
        dpi: settings.dpi || 300,
      });

      console.log('Réponse preview complète:', result); // Debug

      if (result.success) {
        // CORRECTION ICI: La structure est result.data.data et non result.data
        const previewImageData = result.data.data || result.data;

        console.log('Données image:', previewImageData); // Debug

        if (previewImageData && previewImageData.imageBase64) {
          setPreviewData(previewImageData);
          showMessage('success', 'Aperçu généré');
        } else {
          console.error('Structure de données inattendue:', result);
          throw new Error("Données d'image manquantes dans la réponse");
        }
      } else {
        throw new Error(result.message || 'Erreur aperçu');
      }
    } catch (error) {
      console.error('Erreur handlePreview:', error);
      showMessage('error', error.message);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handlePrint = async () => {
    if (!selectedTemplate || !selectedPrinter) {
      showMessage('warning', 'Sélectionnez une imprimante et un template');
      return;
    }

    setPrintLoading(true);
    try {
      const parsedData = JSON.parse(templateData);
      const result = await brotherService.print(selectedTemplate, parsedData, {
        printer: selectedPrinter,
        copies: 1,
      });

      if (result.success) {
        showMessage('success', result.data.message || 'Étiquette imprimée avec succès');
      } else {
        throw new Error(result.message || 'Erreur impression');
      }
    } catch (error) {
      showMessage('error', error.message);
    } finally {
      setPrintLoading(false);
    }
  };

  const showTemplateObjects = async (templateName) => {
    try {
      const result = await brotherService.getTemplateObjects(templateName);
      if (result.success) {
        setTemplateObjectsModal({ visible: true, template: result.data });
        setTemplateInfo(result.data.templateInfo); // NOUVEAU
      }
    } catch (error) {
      showMessage('error', error.message);
    }
  };

  const generateSampleData = (templateObjects) => {
    if (!templateObjects || !templateObjects.foundObjects) return '{}';

    const sampleData = {};
    templateObjects.foundObjects.forEach((obj) => {
      if (obj.type === 'Text') {
        if (
          obj.name.toLowerCase().includes('company') ||
          obj.name.toLowerCase().includes('societe')
        ) {
          sampleData[obj.name] = 'Ma Société';
        } else if (
          obj.name.toLowerCase().includes('name') ||
          obj.name.toLowerCase().includes('nom')
        ) {
          sampleData[obj.name] = 'Jean Dupont';
        } else if (obj.name.toLowerCase().includes('date')) {
          sampleData[obj.name] = new Date().toLocaleDateString('fr-FR');
        } else {
          sampleData[obj.name] = `Exemple ${obj.name}`;
        }
      } else if (obj.type === 'Barcode') {
        sampleData[obj.name] = '1234567890123';
      }
    });

    return JSON.stringify(sampleData, null, 2);
  };

  // Composant Message
  const MessageAlert = () => {
    if (!message.text) return null;

    const styles = {
      success: 'bg-green-50 border-green-200 text-green-800',
      error: 'bg-red-50 border-red-200 text-red-800',
      warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    };

    return (
      <div
        className={`fixed top-4 right-4 z-50 p-4 border rounded-md ${styles[message.type]} shadow-md`}
      >
        <div className="flex items-center space-x-2">
          {message.type === 'success' && <CheckCircle className="w-5 h-5" />}
          {message.type === 'error' && <AlertTriangle className="w-5 h-5" />}
          {message.type === 'warning' && <AlertTriangle className="w-5 h-5" />}
          <span>{message.text}</span>
        </div>
      </div>
    );
  };

  // Composant Modal
  const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="text-lg font-semibold">{title}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">
              ×
            </button>
          </div>
          <div className="p-4">{children}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <MessageAlert />

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Printer className="w-8 h-8" />
          Configuration Imprimante Brother
        </h1>
      </div>

      {/* Status du système */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              {healthStatus?.status === 'ok' ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-500" />
              )}
              <span className="font-medium">Statut: {healthStatus?.status || 'Chargement...'}</span>
            </div>
            {healthStatus?.bridgeVersion && (
              <span className="text-gray-500 text-sm">Version: {healthStatus.bridgeVersion}</span>
            )}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={loadInitialData}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Actualiser</span>
            </button>
            <button
              onClick={() => setSettingsModalVisible(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span>Paramètres</span>
            </button>
          </div>
        </div>

        {healthStatus?.status === 'error' && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <div>
                <p className="font-medium text-red-800">Erreur de connexion</p>
                <p className="text-red-600">{healthStatus.error}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Colonne gauche - Configuration */}
        <div className="space-y-6">
          {/* Sélection imprimante */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold mb-4">Sélection Imprimante</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Imprimante</label>
                <select
                  value={selectedPrinter}
                  onChange={(e) => setSelectedPrinter(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Sélectionner une imprimante</option>
                  {printers.map((printer) => (
                    <option key={printer} value={printer}>
                      {printer}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Upload template */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold mb-4">Gestion Templates</h2>

            <div className="space-y-4">
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".lbx"
                  onChange={handleUploadTemplate}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  <span>Uploader Template (.lbx)</span>
                </button>
              </div>

              <div className="border rounded-md">
                <div className="max-h-64 overflow-y-auto">
                  {templates.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">Aucun template disponible</div>
                  ) : (
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="text-left p-3 text-sm font-medium text-gray-700">Nom</th>
                          <th className="text-left p-3 text-sm font-medium text-gray-700">
                            Taille
                          </th>
                          <th className="text-right p-3 text-sm font-medium text-gray-700">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {templates.map((template) => (
                          <tr key={template.name} className="border-b hover:bg-gray-50">
                            <td className="p-3 text-sm">{template.displayName}</td>
                            <td className="p-3 text-sm text-gray-500">
                              {(template.size / 1024).toFixed(1)} KB
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex justify-end space-x-1">
                                <button
                                  onClick={() => showTemplateObjects(template.name)}
                                  className="p-1 text-gray-400 hover:text-gray-600"
                                  title="Voir les objets"
                                >
                                  <Info className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setSelectedTemplate(template.name)}
                                  className="px-2 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded"
                                >
                                  Sélectionner
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Colonne droite - Test et aperçu */}
        <div className="space-y-6">
          {/* Configuration étiquette */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold mb-4">Test Étiquette</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Template</label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Sélectionner un template</option>
                  {templates.map((template) => (
                    <option key={template.name} value={template.name}>
                      {template.displayName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Données Test (JSON)
                </label>
                <textarea
                  rows={8}
                  value={templateData}
                  onChange={(e) => setTemplateData(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-md font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handlePreview}
                  disabled={!selectedTemplate || previewLoading}
                  className="flex items-center justify-center space-x-2 px-4 py-3 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 text-white rounded-md transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  <span>{previewLoading ? 'Génération...' : 'Aperçu'}</span>
                </button>

                <button
                  onClick={handlePrint}
                  disabled={!selectedTemplate || !selectedPrinter || printLoading}
                  className="flex items-center justify-center space-x-2 px-4 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-md transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  <span>{printLoading ? 'Impression...' : 'Imprimer'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Aperçu */}
          {(previewData || previewLoading) && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-semibold mb-4">Aperçu Étiquette</h2>
              <div className="text-center">
                {previewLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                    <span className="ml-2 text-gray-500">Génération de l'aperçu...</span>
                  </div>
                ) : previewData ? (
                  <div>
                    <img
                      src={`data:${previewData.mimeType};base64,${previewData.imageBase64}`}
                      alt="Aperçu étiquette"
                      className="max-w-full border border-gray-300 rounded mx-auto bg-white"
                      style={{ maxHeight: '400px' }}
                    />
                    <div className="mt-3 text-sm text-gray-500 space-y-1">
                      <p>Template: {previewData.templateName}</p>
                      <p>Résolution: {previewData.dpi} DPI</p>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {templateInfo && selectedTemplate && (
            <div className="mt-2 p-3 bg-gray-50 rounded text-sm">
              <p>
                <strong>Dimensions:</strong> {templateInfo.width} x {templateInfo.length} mm
              </p>
              <p>
                <strong>Orientation:</strong> {templateInfo.orientation}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Objets Template */}
      <Modal
        isOpen={templateObjectsModal.visible}
        onClose={() => setTemplateObjectsModal({ visible: false, template: null })}
        title="Objets du Template"
      >
        {templateObjectsModal.template && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Template:</span>{' '}
                {templateObjectsModal.template.templateName}
              </div>
              <div>
                <span className="font-medium">Objets trouvés:</span>{' '}
                {templateObjectsModal.template.totalFound}
              </div>
            </div>

            {templateObjectsModal.template.foundObjects &&
            templateObjectsModal.template.foundObjects.length > 0 ? (
              <div>
                <h4 className="font-medium mb-2">Objets disponibles:</h4>
                <div className="border rounded-md">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left p-3">Nom</th>
                        <th className="text-left p-3">Type</th>
                        <th className="text-left p-3">Index</th>
                      </tr>
                    </thead>
                    <tbody>
                      {templateObjectsModal.template.foundObjects.map((obj, index) => (
                        <tr key={index} className="border-b">
                          <td className="p-3 font-mono">{obj.name}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                obj.type === 'Text'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-green-100 text-green-800'
                              }`}
                            >
                              {obj.type}
                            </span>
                          </td>
                          <td className="p-3 text-gray-500">{obj.index}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4">
                  <h4 className="font-medium mb-2">Données d'exemple:</h4>
                  <textarea
                    rows={6}
                    value={generateSampleData(templateObjectsModal.template)}
                    readOnly
                    onClick={(e) => e.target.select()}
                    className="w-full p-3 border border-gray-300 rounded-md font-mono text-sm bg-gray-50"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Cliquez pour sélectionner et copier ces données d'exemple
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">Aucun objet trouvé dans ce template.</p>
            )}
          </div>
        )}
      </Modal>

      {/* Modal Paramètres */}
      <Modal
        isOpen={settingsModalVisible}
        onClose={() => setSettingsModalVisible(false)}
        title="Paramètres Brother b-PAC"
      >
        <SettingsForm
          settings={settings}
          printers={printers}
          templates={templates}
          onSave={(newSettings) => {
            setSettings(newSettings);
            setSettingsModalVisible(false);
            showMessage('success', 'Paramètres sauvegardés');
          }}
          onCancel={() => setSettingsModalVisible(false)}
        />
      </Modal>
    </div>
  );
};

// Composant formulaire de paramètres
const SettingsForm = ({ settings, printers, templates, onSave, onCancel }) => {
  const [formData, setFormData] = useState(settings);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const result = await brotherService.updateSettings(formData);
      if (result.success) {
        onSave(result.data);
      } else {
        throw new Error(result.message || 'Erreur sauvegarde');
      }
    } catch (error) {
      console.error('Erreur sauvegarde paramètres:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Imprimante par défaut
        </label>
        <select
          value={formData.defaultPrinter || ''}
          onChange={(e) => setFormData({ ...formData, defaultPrinter: e.target.value })}
          className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Sélectionner une imprimante</option>
          {printers.map((printer) => (
            <option key={printer} value={printer}>
              {printer}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Template par défaut</label>
        <select
          value={formData.defaultTemplate || ''}
          onChange={(e) => setFormData({ ...formData, defaultTemplate: e.target.value })}
          className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Sélectionner un template</option>
          {templates.map((template) => (
            <option key={template.name} value={template.name}>
              {template.displayName}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Largeur étiquette (mm)
          </label>
          <input
            type="number"
            min="1"
            max="100"
            value={formData.labelWidth || 29}
            onChange={(e) => setFormData({ ...formData, labelWidth: parseInt(e.target.value) })}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Longueur max (mm)</label>
          <input
            type="number"
            min="10"
            max="120"
            value={formData.maxLength || 120}
            onChange={(e) => setFormData({ ...formData, maxLength: parseInt(e.target.value) })}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Résolution DPI</label>
        <select
          value={formData.dpi || 300}
          onChange={(e) => setFormData({ ...formData, dpi: parseInt(e.target.value) })}
          className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value={180}>180 DPI</option>
          <option value={300}>300 DPI</option>
          <option value={600}>600 DPI</option>
        </select>
      </div>

      <div className="flex items-center space-x-3">
        <input
          type="checkbox"
          id="cutAfterPrint"
          checked={formData.cutAfterPrint || false}
          onChange={(e) => setFormData({ ...formData, cutAfterPrint: e.target.checked })}
          className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="cutAfterPrint" className="text-sm font-medium text-gray-700">
          Découpe automatique
        </label>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
        >
          Annuler
        </button>
        <button
          type="submit"
          className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
        >
          <Save className="w-4 h-4" />
          <span>Sauvegarder</span>
        </button>
      </div>
    </form>
  );
};

export default PrinterConfigPage;
