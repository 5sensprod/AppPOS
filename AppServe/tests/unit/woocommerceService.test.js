require('dotenv').config();
const woocommerceService = require('../../services/woocommerceService');
const Category = require('@models/Category');

// Mock de la base de données
jest.mock('@models/Category');

describe('woocommerceService.deleteCategory', () => {
  it("devrait empêcher la suppression de la catégorie 'non-classe'", async () => {
    // Simuler une catégorie avec le slug "non-classe"
    Category.findById.mockResolvedValue({ id: 1, slug: 'non-classe' });

    await expect(woocommerceService.deleteCategory(1)).rejects.toThrow(
      'Impossible de supprimer la catégorie par défaut WooCommerce.'
    );
  });

  it('devrait supprimer une catégorie normale', async () => {
    // Simuler une catégorie normale avec un woo_id
    Category.findById.mockResolvedValue({ id: 2, slug: 'electronics', woo_id: 123 });

    // Simuler la suppression réussie
    const result = await woocommerceService.deleteCategory(2);

    expect(result).toEqual({ success: true });
  });

  it("devrait renvoyer une erreur si la catégorie n'existe pas", async () => {
    Category.findById.mockResolvedValue(null);

    await expect(woocommerceService.deleteCategory(999)).rejects.toThrow('Category not found');
  });
});
