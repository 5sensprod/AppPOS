// src/components/CategoryGrid.jsx
import React, { useState, useEffect } from 'react';
import apiService from '../services/api';
import { useAuth } from './Auth';

const CategoryGrid = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [newCategory, setNewCategory] = useState({ name: '', description: '' });
  const [showAddForm, setShowAddForm] = useState(false);

  const auth = useAuth();
  const isAuthenticated = auth?.isAuthenticated || false;
  const isAdmin = auth?.currentUser?.role === 'admin';

  // Fonction pour tester la connexion à l'API
  const testApiConnection = async () => {
    try {
      setError(null);
      setLoading(true);
      if (!apiService.isInitialized) {
        await apiService.init();
      }
      const result = await apiService.testConnection();
      console.log('Test de connexion API réussi:', result);
      return true;
    } catch (err) {
      console.error("Erreur de connexion à l'API:", err);
      setError(`Problème de connexion au serveur: ${err.message}`);
      return false;
    }
  };

  // Charger les catégories
  const loadCategories = async () => {
    try {
      // Tester d'abord la connexion
      const connected = await testApiConnection();
      if (!connected) return;

      // Récupérer les catégories
      console.log('Tentative de récupération des catégories...');
      const response = await apiService.get('/api/categories');
      console.log('Données des catégories reçues:', response);

      if (response && response.data) {
        setCategories(Array.isArray(response.data) ? response.data : []);
        setError(null);
      } else {
        setCategories([]);
      }
    } catch (err) {
      console.error('Erreur lors du chargement des catégories:', err);
      setError(`Impossible de charger les catégories: ${err.message || 'Erreur inconnue'}`);
    } finally {
      setLoading(false);
    }
  };

  // Charger les catégories
  // Observer les changements d'état de connexion
  useEffect(() => {
    if (!isAuthenticated) {
      // Réinitialiser les catégories quand l'utilisateur se déconnecte
      setCategories([]);
      setLoading(false);
      setError(null);
    } else {
      // Charger les catégories quand l'utilisateur se connecte
      fetchCategories();
    }
  }, [isAuthenticated]);

  // Fonction pour charger les catégories
  const fetchCategories = async () => {
    try {
      setLoading(true);
      if (!apiService.isInitialized) {
        await apiService.init();
      }

      console.log('Tentative de récupération des catégories...');
      const response = await apiService.get('/api/categories');
      console.log('Réponse reçue:', response);

      // Vérification du format de la réponse
      if (response && response.data && response.data.success && Array.isArray(response.data.data)) {
        setCategories(response.data.data);
      } else if (response && response.data && Array.isArray(response.data)) {
        setCategories(response.data);
      } else {
        console.warn('Format de réponse inattendu:', response.data);
        setCategories([]);
      }
    } catch (err) {
      console.error('Erreur détaillée lors du chargement des catégories:', err);
      setError(`Impossible de charger les catégories: ${err.message || 'Erreur inconnue'}`);
    } finally {
      setLoading(false);
    }
  };

  // Gérer l'ajout d'une catégorie
  const handleAddCategory = async (e) => {
    e.preventDefault();
    try {
      const response = await apiService.post('/api/categories', newCategory);
      setCategories([...categories, response.data]);
      setNewCategory({ name: '', description: '' });
      setShowAddForm(false);
    } catch (err) {
      console.error("Erreur lors de l'ajout de la catégorie:", err);
      setError("Erreur lors de l'ajout de la catégorie");
    }
  };

  // Gérer la mise à jour d'une catégorie
  const handleUpdateCategory = async (e) => {
    e.preventDefault();
    try {
      const response = await apiService.put(
        `/api/categories/${editingCategory.id}`,
        editingCategory
      );
      setCategories(categories.map((cat) => (cat.id === editingCategory.id ? response.data : cat)));
      setEditingCategory(null);
    } catch (err) {
      console.error('Erreur lors de la mise à jour de la catégorie:', err);
      setError('Erreur lors de la mise à jour de la catégorie');
    }
  };

  // Gérer la suppression d'une catégorie
  const handleDeleteCategory = async (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette catégorie?')) {
      try {
        await apiService.delete(`/api/categories/${id}`);
        setCategories(categories.filter((cat) => cat.id !== id));
      } catch (err) {
        console.error('Erreur lors de la suppression de la catégorie:', err);
        setError('Erreur lors de la suppression de la catégorie');
      }
    }
  };

  if (loading) return <div className="text-center py-4">Chargement des catégories...</div>;
  if (error) return <div className="text-red-500 py-4">{error}</div>;

  return (
    <div className="bg-white shadow rounded p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Catégories</h2>
        {isAuthenticated && isAdmin && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded"
          >
            {showAddForm ? 'Annuler' : 'Ajouter'}
          </button>
        )}
      </div>

      {/* Formulaire d'ajout */}
      {showAddForm && isAuthenticated && isAdmin && (
        <form onSubmit={handleAddCategory} className="mb-6 p-3 border rounded">
          <h3 className="font-semibold mb-2">Nouvelle catégorie</h3>
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">Nom</label>
            <input
              type="text"
              value={newCategory.name}
              onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={newCategory.description}
              onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
              className="w-full p-2 border rounded"
            />
          </div>
          <button
            type="submit"
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-3 rounded"
          >
            Enregistrer
          </button>
        </form>
      )}

      {/* Grille des catégories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.length === 0 ? (
          <p className="col-span-full text-center py-4">Aucune catégorie trouvée</p>
        ) : (
          categories.map((category) => (
            <div key={category._id || category.id} className="border rounded p-3 relative">
              {/* Utilise _id ou id comme clé unique */}
              {editingCategory && editingCategory.id === category.id ? (
                <form onSubmit={handleUpdateCategory}>
                  <div className="mb-2">
                    <label className="block text-sm font-medium mb-1">Nom</label>
                    <input
                      type="text"
                      value={editingCategory.name}
                      onChange={(e) =>
                        setEditingCategory({ ...editingCategory, name: e.target.value })
                      }
                      className="w-full p-1 border rounded text-sm"
                      required
                    />
                  </div>
                  <div className="mb-2">
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <textarea
                      value={editingCategory.description}
                      onChange={(e) =>
                        setEditingCategory({ ...editingCategory, description: e.target.value })
                      }
                      className="w-full p-1 border rounded text-sm"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setEditingCategory(null)}
                      className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-1 px-2 rounded text-xs"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-2 rounded text-xs"
                    >
                      Enregistrer
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <h3 className="font-semibold text-lg">{category.name}</h3>
                  <p className="text-gray-600 text-sm mt-1">{category.description}</p>

                  {isAuthenticated && isAdmin && (
                    <div className="absolute top-2 right-2 flex space-x-1">
                      <button
                        onClick={() => setEditingCategory(category)}
                        className="bg-yellow-500 hover:bg-yellow-700 text-white p-1 rounded"
                        title="Modifier"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category.id)}
                        className="bg-red-500 hover:bg-red-700 text-white p-1 rounded"
                        title="Supprimer"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CategoryGrid;
