// components/StockModal.jsx
import React, { useState, useEffect } from 'react';
import { X, Package, Plus, Minus, Settings } from 'lucide-react';

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

    // Pour l'action toggle_manage, pas besoin de valeur numérique
    if (stockAction === 'toggle_manage') {
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
    if (isNaN(value) || value < 0) {
      alert('Veuillez entrer une valeur valide (nombre positif)');
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
        return 'Retirer cette quantité du stock actuel de chaque produit';
      case 'toggle_manage':
        return "Basculer l'activation/désactivation de la gestion de stock pour tous les produits sélectionnés";
      default:
        return '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Gestion du stock
          </h3>
          <button
            onClick={handleClose} // Utiliser la nouvelle fonction
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              <span className="font-semibold">{selectedCount}</span> {itemLabel} sélectionné
              {selectedCount > 1 ? 's' : ''}
            </p>

            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Action à effectuer
            </label>
            <div className="space-y-2">
              {[
                { value: 'set', label: 'Définir le stock' },
                { value: 'add', label: 'Ajouter au stock' },
                { value: 'subtract', label: 'Retirer du stock' },
                { value: 'toggle_manage', label: 'Basculer gestion stock' },
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

          {stockAction !== 'toggle_manage' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Quantité
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={stockValue}
                onChange={(e) => setStockValue(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Entrez la quantité"
                required
                autoFocus // Focus automatique sur le champ quantité
              />
            </div>
          )}

          <div className="mb-6">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {getActionDescription(stockAction)}
            </p>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose} // Utiliser la nouvelle fonction
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || (stockAction !== 'toggle_manage' && !stockValue)}
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
        </form>
      </div>
    </div>
  );
};

export default StockModal;
