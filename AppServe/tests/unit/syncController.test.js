//AppServe\tests\unit\syncController.test.js
const axios = require('axios');
const Category = require('@models/Category');
jest.mock('@models/Category');

describe('syncController.syncSingleCategory', () => {
  const API_URL = 'http://localhost:3000/api/sync';

  beforeEach(() => {
    jest.clearAllMocks(); // Réinitialiser les mocks avant chaque test
  });

  it("devrait échouer si la catégorie n'existe pas", async () => {
    try {
      await axios.put(`${API_URL}/woocommerce/categories/99999`);
    } catch (error) {
      expect(error.response.status).toBe(404);
      expect(error.response.data).toHaveProperty('success', false);
      expect(error.response.data).toHaveProperty('error', 'Catégorie non trouvée');
    }
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
