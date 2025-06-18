// components/StockModal.jsx
import React, { useState, useEffect } from 'react';
import { X, Package, Plus, Minus, Settings, AlertTriangle, Eye, EyeOff } from 'lucide-react';

const StockModal = ({
  isOpen,
  onClose,
  onConfirm,
  selectedItems = [],
  entityName = 'produit',
  entityNamePlural = 'produits',
}) => {
  const [stockAction, setStockAction] = useState('set');
  const [stockValue, setStockValue] = useState('');
  const [loading, setLoading] = useState(false);

  // Réinitialiser les champs quand la modal s'ouvre ou se ferme
  useEffect(() => {
    if (isOpen) {
      // Réinitialiser à l'ouverture
      setStockAction('set');
      setStockValue('');
      setLoading(false);
    }
  }, [isOpen]);

  // Fonction pour réinitialiser les champs
  const resetForm = () => {
    setStockAction('set');
    setStockValue('');
    setLoading(false);
  };

  // Fonction pour fermer et réinitialiser
  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  const selectedCount = selectedItems.length;
  const itemLabel = selectedCount === 1 ? entityName : entityNamePlural;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stockAction) return;

    // Pour les actions de gestion, pas besoin de valeur numérique
    if (['toggle_manage', 'enable_manage', 'disable_manage'].includes(stockAction)) {
      setLoading(true);
      try {
        await onConfirm(selectedItems, stockAction, null);
        resetForm(); // Réinitialiser après succès
        onClose();
      } catch (error) {
        console.error('Erreur lors de la mise à jour du stock:', error);
        setLoading(false); // Réinitialiser seulement le loading en cas d'erreur
      }
      return;
    }

    // Pour les autres actions, vérifier la valeur
    const value = parseFloat(stockValue);
    if (isNaN(value)) {
      alert('Veuillez entrer une valeur numérique valide');
      return;
    }

    // Validation spécifique pour le stock minimum (doit être positif)
    if (stockAction === 'set_min_stock' && value < 0) {
      alert('Le stock minimum doit être une valeur positive ou nulle');
      return;
    }

    // Validation pour les autres actions (sauf subtract qui peut créer des négatifs)
    if (['set', 'add'].includes(stockAction) && value < 0) {
      alert('Veuillez entrer une valeur positive');
      return;
    }

    setLoading(true);
    try {
      await onConfirm(selectedItems, stockAction, value);
      resetForm(); // Réinitialiser après succès
      onClose();
    } catch (error) {
      console.error('Erreur lors de la mise à jour du stock:', error);
      setLoading(false); // Réinitialiser seulement le loading en cas d'erreur
    }
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'add':
        return <Plus className="h-4 w-4" />;
      case 'subtract':
        return <Minus className="h-4 w-4" />;
      case 'set_min_stock':
        return <AlertTriangle className="h-4 w-4" />;
      case 'enable_manage':
        return <Eye className="h-4 w-4" />;
      case 'disable_manage':
        return <EyeOff className="h-4 w-4" />;
      case 'toggle_manage':
        return <Settings className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const getActionDescription = (action) => {
    switch (action) {
      case 'set':
        return 'Définir le stock à cette valeur pour tous les produits sélectionnés';
      case 'add':
        return 'Ajouter cette quantité au stock actuel de chaque produit';
      case 'subtract':
        return 'Retirer cette quantité du stock actuel de chaque produit (stock négatif autorisé)';
      case 'set_min_stock':
        return 'Définir le stock minimum à cette valeur pour tous les produits sélectionnés';
      case 'enable_manage':
        return "Activer l'affichage du stock sur la page produit pour tous les produits sélectionnés";
      case 'disable_manage':
        return "Désactiver l'affichage du stock sur la page produit pour tous les produits sélectionnés";
      case 'toggle_manage':
        return "Basculer l'affichage du stock sur la page produit pour les produits synchronisés";
      default:
        return '';
    }
  };

  const getInputLabel = (action) => {
    switch (action) {
      case 'set_min_stock':
        return 'Stock minimum';
      default:
        return 'Quantité';
    }
  };

  const getInputPlaceholder = (action) => {
    switch (action) {
      case 'set_min_stock':
        return 'Entrez le stock minimum';
      default:
        return 'Entrez la quantité';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-full flex flex-col">
        {/* En-tête fixe */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Gestion du stock
          </h3>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Corps avec ascenseur */}
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="flex flex-col h-full">
            <div className="p-6 flex-1">
              <div className="mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  <span className="font-semibold">{selectedCount}</span> {itemLabel} sélectionné
                  {selectedCount > 1 ? 's' : ''}
                </p>

                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Gestion des quantités
                </label>
                <div className="space-y-2 mb-6">
                  {[
                    { value: 'set', label: 'Définir le stock' },
                    { value: 'add', label: 'Ajouter au stock' },
                    { value: 'subtract', label: 'Retirer du stock' },
                    { value: 'set_min_stock', label: 'Définir stock minimum' },
                  ].map((option) => (
                    <label key={option.value} className="flex items-center">
                      <input
                        type="radio"
                        name="stockAction"
                        value={option.value}
                        checked={stockAction === option.value}
                        onChange={(e) => setStockAction(e.target.value)}
                        className="mr-3 text-blue-600"
                      />
                      <span className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                        {getActionIcon(option.value)}
                        <span className="ml-2">{option.label}</span>
                      </span>
                    </label>
                  ))}
                </div>

                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Visibilité stock en ligne
                </label>
                <div className="space-y-2">
                  {[
                    { value: 'enable_manage', label: 'Afficher le stock' },
                    { value: 'disable_manage', label: 'Masquer le stock' },
                  ].map((option) => (
                    <label key={option.value} className="flex items-center">
                      <input
                        type="radio"
                        name="stockAction"
                        value={option.value}
                        checked={stockAction === option.value}
                        onChange={(e) => setStockAction(e.target.value)}
                        className="mr-3 text-blue-600"
                      />
                      <span className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                        {getActionIcon(option.value)}
                        <span className="ml-2">{option.label}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {!['toggle_manage', 'enable_manage', 'disable_manage'].includes(stockAction) && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {getInputLabel(stockAction)}
                  </label>
                  <input
                    type="number"
                    min={stockAction === 'set_min_stock' ? '0' : undefined}
                    step="1"
                    value={stockValue}
                    onChange={(e) => setStockValue(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder={getInputPlaceholder(stockAction)}
                    required
                    autoFocus
                  />
                </div>
              )}

              <div className="mb-6">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {getActionDescription(stockAction)}
                </p>
              </div>
            </div>

            {/* Pied de page fixe */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={
                    loading ||
                    (!['toggle_manage', 'enable_manage', 'disable_manage'].includes(stockAction) &&
                      !stockValue)
                  }
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md flex items-center"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Traitement...
                    </>
                  ) : (
                    'Appliquer'
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default StockModal;
