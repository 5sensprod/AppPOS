//tests/unit/Category.test.js
const Category = require('../../models/Category');
const db = require('../../config/database');

// Mock de la base de données
jest.mock('../../config/database', () => ({
  categories: {
    insert: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  },
}));

describe('Category Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait créer une catégorie', async () => {
    const newCategory = { name: 'Test Category', slug: 'test-category' };

    db.categories.insert.mockImplementation((data, callback) => {
      callback(null, { _id: '123', ...data });
    });

    const result = await Category.create(newCategory);
    expect(result).toHaveProperty('_id', '123');
    expect(result).toHaveProperty('name', 'Test Category');
  });

  it('devrait récupérer toutes les catégories', async () => {
    const mockCategories = [
      { _id: '1', name: 'Cat 1' },
      { _id: '2', name: 'Cat 2' },
    ];

    db.categories.find.mockImplementation((query, callback) => {
      callback(null, mockCategories);
    });

    const result = await Category.findAll();
    expect(result).toHaveLength(2);
    expect(result[0]).toHaveProperty('_id', '1');
    expect(result[1]).toHaveProperty('_id', '2');
  });

  it('devrait trouver une catégorie par ID', async () => {
    const mockCategory = { _id: '123', name: 'Test Category' };

    db.categories.findOne.mockImplementation((query, callback) => {
      callback(null, mockCategory);
    });

    const result = await Category.findById('123');
    expect(result).toHaveProperty('_id', '123');
    expect(result).toHaveProperty('name', 'Test Category');
  });

  it('devrait mettre à jour une catégorie', async () => {
    db.categories.update.mockImplementation((query, update, options, callback) => {
      callback(null, 1);
    });

    const result = await Category.update('123', { name: 'Updated Category' });
    expect(result).toBe(1);
  });

  it('devrait supprimer une catégorie existante', async () => {
    db.categories.findOne.mockImplementation((query, callback) => {
      callback(null, {
        _id: '123',
        name: 'Test Category',
        image: { local_path: '/path/to/image' },
      });
    });

    db.categories.remove.mockImplementation((query, options, callback) => {
      callback(null, 1);
    });

    const result = await Category.delete('123');
    expect(result).toBe(1);
  });

  it('devrait ne rien supprimer si la catégorie n’existe pas', async () => {
    db.categories.findOne.mockImplementation((query, callback) => {
      callback(null, null);
    });

    const result = await Category.delete('999');
    expect(result).toBe(0);
  });
});

it('devrait supprimer une catégorie sans image', async () => {
  db.categories.findOne.mockImplementation((query, callback) => {
    callback(null, { _id: '123', name: 'No Image Category' }); // Pas de champ `image`
  });

  db.categories.remove.mockImplementation((query, options, callback) => {
    callback(null, 1);
  });

  const result = await Category.delete('123');
  expect(result).toBe(1);
});

it('devrait appeler findById() avec le bon ID', async () => {
  db.categories.findOne.mockImplementation((query, callback) => {
    callback(null, { _id: '456', name: 'Find Me' });
  });

  const spy = jest.spyOn(Category, 'findById');
  await Category.findById('456');

  expect(spy).toHaveBeenCalledWith('456');
});

it('devrait renvoyer une erreur si la suppression échoue', async () => {
  db.categories.remove.mockImplementation((query, options, callback) => {
    callback(new Error('Database error'), null);
  });

  await expect(Category.delete('789')).rejects.toThrow('Database error');
});

it('devrait renvoyer une erreur si findById échoue', async () => {
  db.categories.findOne.mockImplementation((query, callback) => {
    callback(new Error('Database error'), null);
  });

  await expect(Category.findById('999')).rejects.toThrow('Database error');
});

it("devrait renvoyer 0 si aucune catégorie n'est mise à jour", async () => {
  db.categories.update.mockImplementation((query, update, options, callback) => {
    callback(null, 0);
  });

  const result = await Category.update('999', { name: 'Non Existent' });
  expect(result).toBe(0);
});

jest.mock('fs/promises', () => ({
  rm: jest.fn().mockRejectedValue(new Error('Permission denied')),
}));

it("devrait ne pas planter si la suppression d'image échoue", async () => {
  db.categories.findOne.mockImplementation((query, callback) => {
    callback(null, { _id: '123', name: 'Test', image: { local_path: '/fake/path' } });
  });

  db.categories.remove.mockImplementation((query, options, callback) => {
    callback(null, 1);
  });

  const result = await Category.delete('123');
  expect(result).toBe(1);
});

it('devrait renvoyer une erreur si findAll échoue', async () => {
  db.categories.find.mockImplementation((query, callback) => {
    callback(new Error('Database error'), null);
  });

  await expect(Category.findAll()).rejects.toThrow('Database error');
});
