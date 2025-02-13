const axios = require('axios');
const Category = require('@models/Category'); // Assure-toi que ce chemin est correct
jest.mock('@models/Category'); // Mock du modèle Category

describe('syncController.syncSingleCategory', () => {
  const API_URL = 'http://localhost:3000/api';

  beforeEach(() => {
    jest.clearAllMocks(); // Réinitialiser les mocks avant chaque test
  });

  it('devrait synchroniser une catégorie existante', async () => {
    // Simuler une catégorie trouvée
    Category.findById.mockResolvedValue({ id: 123, name: 'Mocked Category' });

    // Simuler la réponse de l'API
    const response = await axios.put(`${API_URL}/woocommerce/categories/123`);

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('success', true);
    expect(response.data).toHaveProperty('summary');
  });

  it("devrait échouer si la catégorie n'existe pas", async () => {
    // Simuler une catégorie non trouvée
    Category.findById.mockResolvedValue(null);

    try {
      await axios.put(`${API_URL}/woocommerce/categories/99999`);
    } catch (error) {
      expect(error.response.status).toBe(404); // Vérifie que l'API retourne bien 404
      expect(error.response.data).toHaveProperty('success', false);
    }
  });
});
