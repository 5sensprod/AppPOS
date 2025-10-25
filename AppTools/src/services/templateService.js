// src/services/templateService.js

/**
 * Service de gestion des templates d'étiquettes
 * Utilise IndexedDB pour le stockage local
 * Structure extensible vers API backend
 */

class TemplateService {
  constructor() {
    this.dbName = 'LabelTemplatesDB';
    this.dbVersion = 1;
    this.storeName = 'templates';
    this.db = null;
  }

  /**
   * 🔧 Initialise la base de données IndexedDB
   */
  async initDB() {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('❌ Erreur ouverture IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ IndexedDB initialisée');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Créer le store si nécessaire
        if (!db.objectStoreNames.contains(this.storeName)) {
          const objectStore = db.createObjectStore(this.storeName, {
            keyPath: 'id',
            autoIncrement: false,
          });

          // Index pour recherche par nom
          objectStore.createIndex('name', 'name', { unique: false });
          objectStore.createIndex('createdAt', 'createdAt', { unique: false });
          objectStore.createIndex('category', 'category', { unique: false });

          console.log('✅ Object store créé');
        }
      };
    });
  }

  /**
   * 💾 Sauvegarde un template
   * @param {Object} templateData - Données du template depuis le store Zustand
   * @param {Object} metadata - Métadonnées (nom, description, catégorie, etc.)
   */
  async saveTemplate(templateData, metadata = {}) {
    try {
      await this.initDB();

      const template = {
        id: metadata.id || `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: metadata.name || `Template ${new Date().toLocaleDateString('fr-FR')}`,
        description: metadata.description || '',
        category: metadata.category || 'custom',
        thumbnail: metadata.thumbnail || null, // Base64 ou URL de preview

        // ✅ Données du canvas (depuis useLabelStore)
        elements: templateData.elements || [],
        canvasSize: templateData.canvasSize || { width: 800, height: 600 },

        // ✅ Configuration planche (si applicable)
        sheetSettings: templateData.sheetSettings || null,
        lockCanvasToSheetCell: templateData.lockCanvasToSheetCell || false,

        // ✅ Métadonnées de source
        dataSource: templateData.dataSource || 'blank',

        // ✅ Timestamps
        createdAt: metadata.createdAt || Date.now(),
        updatedAt: Date.now(),

        // ✅ Tags pour filtrage
        tags: metadata.tags || [],
      };

      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(template);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          console.log('✅ Template sauvegardé:', template.id);
          resolve(template);
        };
        request.onerror = () => {
          console.error('❌ Erreur sauvegarde template:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('❌ Erreur saveTemplate:', error);
      throw error;
    }
  }

  /**
   * 📋 Récupère tous les templates
   * @param {Object} filters - Filtres optionnels (category, tags)
   */
  async listTemplates(filters = {}) {
    try {
      await this.initDB();

      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          let templates = request.result || [];

          // Filtrer par catégorie
          if (filters.category) {
            templates = templates.filter((t) => t.category === filters.category);
          }

          // Filtrer par tags
          if (filters.tags && filters.tags.length > 0) {
            templates = templates.filter((t) => filters.tags.some((tag) => t.tags?.includes(tag)));
          }

          // Trier par date de modification (plus récent en premier)
          templates.sort((a, b) => b.updatedAt - a.updatedAt);

          console.log(`✅ ${templates.length} template(s) récupéré(s)`);
          resolve(templates);
        };

        request.onerror = () => {
          console.error('❌ Erreur listTemplates:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('❌ Erreur listTemplates:', error);
      return [];
    }
  }

  /**
   * 🔍 Récupère un template par son ID
   */
  async getTemplate(id) {
    try {
      await this.initDB();

      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(id);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const template = request.result;
          if (template) {
            console.log('✅ Template récupéré:', id);
            resolve(template);
          } else {
            console.warn('⚠️ Template non trouvé:', id);
            resolve(null);
          }
        };

        request.onerror = () => {
          console.error('❌ Erreur getTemplate:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('❌ Erreur getTemplate:', error);
      return null;
    }
  }

  /**
   * 🗑️ Supprime un template
   */
  async deleteTemplate(id) {
    try {
      await this.initDB();

      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          console.log('✅ Template supprimé:', id);
          resolve(true);
        };

        request.onerror = () => {
          console.error('❌ Erreur deleteTemplate:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('❌ Erreur deleteTemplate:', error);
      throw error;
    }
  }

  /**
   * ✏️ Met à jour un template existant
   */
  async updateTemplate(id, updates) {
    try {
      const existing = await this.getTemplate(id);
      if (!existing) {
        throw new Error(`Template ${id} non trouvé`);
      }

      const updated = {
        ...existing,
        ...updates,
        id, // Préserver l'ID
        updatedAt: Date.now(),
      };

      return await this.saveTemplate(
        {
          elements: updated.elements,
          canvasSize: updated.canvasSize,
          sheetSettings: updated.sheetSettings,
          lockCanvasToSheetCell: updated.lockCanvasToSheetCell,
          dataSource: updated.dataSource,
        },
        {
          id: updated.id,
          name: updated.name,
          description: updated.description,
          category: updated.category,
          thumbnail: updated.thumbnail,
          tags: updated.tags,
          createdAt: updated.createdAt,
        }
      );
    } catch (error) {
      console.error('❌ Erreur updateTemplate:', error);
      throw error;
    }
  }

  /**
   * 📤 Exporte un template en JSON (pour partage)
   */
  async exportTemplate(id) {
    try {
      const template = await this.getTemplate(id);
      if (!template) {
        throw new Error(`Template ${id} non trouvé`);
      }

      const json = JSON.stringify(template, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      // Télécharger le fichier
      const a = document.createElement('a');
      a.href = url;
      a.download = `${template.name.replace(/[^a-z0-9]/gi, '_')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log('✅ Template exporté:', id);
      return true;
    } catch (error) {
      console.error('❌ Erreur exportTemplate:', error);
      throw error;
    }
  }

  /**
   * 📥 Importe un template depuis JSON
   */
  async importTemplate(file) {
    try {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = async (e) => {
          try {
            const json = e.target.result;
            const template = JSON.parse(json);

            // Générer un nouvel ID pour éviter les conflits
            const imported = {
              ...template,
              id: `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              name: `${template.name} (importé)`,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };

            const saved = await this.saveTemplate(
              {
                elements: imported.elements,
                canvasSize: imported.canvasSize,
                sheetSettings: imported.sheetSettings,
                lockCanvasToSheetCell: imported.lockCanvasToSheetCell,
                dataSource: imported.dataSource,
              },
              {
                id: imported.id,
                name: imported.name,
                description: imported.description,
                category: imported.category,
                thumbnail: imported.thumbnail,
                tags: imported.tags,
                createdAt: imported.createdAt,
              }
            );

            console.log('✅ Template importé:', saved.id);
            resolve(saved);
          } catch (error) {
            console.error('❌ Erreur parsing JSON:', error);
            reject(new Error('Fichier JSON invalide'));
          }
        };

        reader.onerror = () => {
          console.error('❌ Erreur lecture fichier');
          reject(new Error('Erreur lecture fichier'));
        };

        reader.readAsText(file);
      });
    } catch (error) {
      console.error('❌ Erreur importTemplate:', error);
      throw error;
    }
  }

  /**
   * 🖼️ Génère une miniature du template (capture du canvas)
   */
  async generateThumbnail(stageRef, options = {}) {
    try {
      if (!stageRef?.current) {
        console.warn('⚠️ Stage ref non disponible');
        return null;
      }

      const { width = 300, height = 200, quality = 0.8 } = options;

      // Capturer le canvas
      const dataUrl = stageRef.current.toDataURL({
        pixelRatio: 2,
        mimeType: 'image/jpeg',
        quality,
      });

      // Redimensionner si nécessaire
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);

          // Dessiner en gardant les proportions
          const scale = Math.min(width / img.width, height / img.height);
          const x = (width - img.width * scale) / 2;
          const y = (height - img.height * scale) / 2;

          ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

          resolve(canvas.toDataURL('image/jpeg', quality));
        };

        img.onerror = () => {
          console.error('❌ Erreur génération thumbnail');
          resolve(null);
        };

        img.src = dataUrl;
      });
    } catch (error) {
      console.error('❌ Erreur generateThumbnail:', error);
      return null;
    }
  }

  /**
   * 🔄 Dupliquer un template
   */
  async duplicateTemplate(id) {
    try {
      const template = await this.getTemplate(id);
      if (!template) {
        throw new Error(`Template ${id} non trouvé`);
      }

      const duplicate = {
        ...template,
        id: `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: `${template.name} (copie)`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      return await this.saveTemplate(
        {
          elements: duplicate.elements,
          canvasSize: duplicate.canvasSize,
          sheetSettings: duplicate.sheetSettings,
          lockCanvasToSheetCell: duplicate.lockCanvasToSheetCell,
          dataSource: duplicate.dataSource,
        },
        {
          id: duplicate.id,
          name: duplicate.name,
          description: duplicate.description,
          category: duplicate.category,
          thumbnail: duplicate.thumbnail,
          tags: duplicate.tags,
          createdAt: duplicate.createdAt,
        }
      );
    } catch (error) {
      console.error('❌ Erreur duplicateTemplate:', error);
      throw error;
    }
  }

  /**
   * 🧹 Nettoie tous les templates (attention !)
   */
  async clearAllTemplates() {
    try {
      await this.initDB();

      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          console.log('✅ Tous les templates supprimés');
          resolve(true);
        };

        request.onerror = () => {
          console.error('❌ Erreur clearAllTemplates:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('❌ Erreur clearAllTemplates:', error);
      throw error;
    }
  }

  /**
   * 📊 Statistiques des templates
   */
  async getStats() {
    try {
      const templates = await this.listTemplates();

      const stats = {
        total: templates.length,
        byCategory: {},
        recentCount: 0, // Derniers 7 jours
      };

      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

      templates.forEach((template) => {
        // Par catégorie
        stats.byCategory[template.category] = (stats.byCategory[template.category] || 0) + 1;

        // Récents
        if (template.createdAt > sevenDaysAgo) {
          stats.recentCount++;
        }
      });

      return stats;
    } catch (error) {
      console.error('❌ Erreur getStats:', error);
      return { total: 0, byCategory: {}, recentCount: 0 };
    }
  }
}

export default new TemplateService();
