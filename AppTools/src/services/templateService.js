// AppTools/src/services/templateService.hybrid.js
import Konva from 'konva';
import templateApiService from './templateApiService';

/**
 * 🎨 Service HYBRIDE de gestion des templates
 * Combine IndexedDB (local) et API (cloud)
 *
 * Modes de fonctionnement :
 * - 'local': IndexedDB uniquement (par défaut si hors ligne)
 * - 'api': API uniquement
 * - 'hybrid': Les deux (recommandé)
 */
class TemplateService {
  constructor() {
    this.dbName = 'LabelTemplatesDB';
    this.dbVersion = 1;
    this.storeName = 'templates';
    this.db = null;

    // 🆕 Mode de stockage
    this.storageMode = 'hybrid'; // 'local' | 'api' | 'hybrid'

    // 🆕 Préférence de l'utilisateur (récupérée du localStorage)
    this.userPreference = this.loadUserPreference();
  }

  /**
   * 💾 Charge la préférence utilisateur
   */
  loadUserPreference() {
    try {
      const pref = localStorage.getItem('templateStoragePreference');
      return pref || 'hybrid';
    } catch {
      return 'hybrid';
    }
  }

  /**
   * 💾 Sauvegarde la préférence utilisateur
   */
  setUserPreference(mode) {
    try {
      this.userPreference = mode;
      localStorage.setItem('templateStoragePreference', mode);
      console.log('✅ [TEMPLATES] Préférence sauvegardée:', mode);
    } catch (error) {
      console.error('❌ [TEMPLATES] Erreur sauvegarde préférence:', error);
    }
  }

  /**
   * 🔧 Initialise la base de données IndexedDB
   */
  async initDB() {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('❌ [TEMPLATES-LOCAL] Erreur ouverture IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ [TEMPLATES-LOCAL] IndexedDB initialisée');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains(this.storeName)) {
          const objectStore = db.createObjectStore(this.storeName, {
            keyPath: 'id',
            autoIncrement: false,
          });

          objectStore.createIndex('name', 'name', { unique: false });
          objectStore.createIndex('createdAt', 'createdAt', { unique: false });
          objectStore.createIndex('category', 'category', { unique: false });
          objectStore.createIndex('source', 'source', { unique: false }); // 🆕 'local' | 'api'

          console.log('✅ [TEMPLATES-LOCAL] Object store créé');
        }
      };
    });
  }

  /**
   * 📋 Liste TOUS les templates (local + API)
   */
  async listTemplates(filters = {}) {
    const mode = this.userPreference;

    try {
      if (mode === 'api') {
        // API uniquement
        return await templateApiService.listTemplates(filters);
      }

      if (mode === 'local') {
        // Local uniquement
        return await this.listFromIndexedDB(filters);
      }

      // Mode hybride : fusionner les deux sources
      const [localTemplates, apiTemplates] = await Promise.all([
        this.listFromIndexedDB(filters),
        templateApiService.listTemplates(filters).catch(() => []),
      ]);

      return this.mergeTemplates(localTemplates, apiTemplates);
    } catch (error) {
      console.error('❌ [TEMPLATES] Erreur listTemplates:', error);
      // Fallback sur local en cas d'erreur
      return await this.listFromIndexedDB(filters);
    }
  }

  /**
   * 📋 Liste les templates depuis IndexedDB
   */
  async listFromIndexedDB(filters = {}) {
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

          console.log(`✅ [TEMPLATES-LOCAL] ${templates.length} template(s) récupéré(s)`);
          resolve(templates);
        };

        request.onerror = () => {
          console.error('❌ [TEMPLATES-LOCAL] Erreur listFromIndexedDB:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('❌ [TEMPLATES-LOCAL] Erreur listFromIndexedDB:', error);
      return [];
    }
  }

  /**
   * 🔄 Fusionne les templates locaux et API
   * Évite les doublons, donne priorité à l'API si même ID
   */
  mergeTemplates(localTemplates, apiTemplates) {
    const merged = new Map();

    // Ajouter les templates locaux
    localTemplates.forEach((template) => {
      merged.set(template.id || template._id, {
        ...template,
        source: 'local',
      });
    });

    // Ajouter/remplacer par les templates API
    apiTemplates.forEach((template) => {
      const id = template._id || template.id;
      merged.set(id, {
        ...template,
        id: id, // Normaliser l'ID
        source: 'api',
      });
    });

    return Array.from(merged.values());
  }

  /**
   * 💾 Sauvegarde un template
   */
  async saveTemplate(templateData, metadata = {}) {
    const mode = this.userPreference;

    try {
      const template = {
        id: metadata.id || `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: metadata.name || `Template ${new Date().toLocaleDateString('fr-FR')}`,
        description: metadata.description || '',
        category: metadata.category || 'custom',
        thumbnail: metadata.thumbnail || null,

        // Données du canvas
        elements: templateData.elements || [],
        canvasSize: templateData.canvasSize || { width: 800, height: 600 },
        sheetSettings: templateData.sheetSettings || null,
        lockCanvasToSheetCell: templateData.lockCanvasToSheetCell || false,
        dataSource: templateData.dataSource || 'blank',

        // Timestamps
        createdAt: metadata.createdAt || Date.now(),
        updatedAt: Date.now(),
        tags: metadata.tags || [],

        // Source
        source: mode === 'local' ? 'local' : 'api',
      };

      if (mode === 'api' || mode === 'hybrid') {
        // Sauvegarder via API
        try {
          const apiTemplate = await templateApiService.saveTemplate(templateData, metadata);
          console.log("✅ [TEMPLATES-API] Template sauvegardé dans l'API");

          // Si mode hybride, sauvegarder aussi localement
          if (mode === 'hybrid') {
            await this.saveToIndexedDB({ ...template, _id: apiTemplate._id });
          }

          return apiTemplate;
        } catch (error) {
          console.error('❌ [TEMPLATES-API] Erreur sauvegarde API:', error);

          // Fallback sur local si API échoue
          if (mode === 'hybrid') {
            console.warn('⚠️ [TEMPLATES] Fallback sur sauvegarde locale');
            return await this.saveToIndexedDB(template);
          }
          throw error;
        }
      }

      // Mode local uniquement
      return await this.saveToIndexedDB(template);
    } catch (error) {
      console.error('❌ [TEMPLATES] Erreur saveTemplate:', error);
      throw error;
    }
  }

  /**
   * 💾 Sauvegarde dans IndexedDB
   */
  async saveToIndexedDB(template) {
    try {
      await this.initDB();

      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(template);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          console.log('✅ [TEMPLATES-LOCAL] Template sauvegardé localement:', template.id);
          resolve(template);
        };
        request.onerror = () => {
          console.error('❌ [TEMPLATES-LOCAL] Erreur sauvegarde:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('❌ [TEMPLATES-LOCAL] Erreur saveToIndexedDB:', error);
      throw error;
    }
  }

  /**
   * 🔍 Récupère un template par son ID
   */
  async getTemplate(id) {
    const mode = this.userPreference;

    try {
      if (mode === 'api') {
        return await templateApiService.getTemplate(id);
      }

      if (mode === 'local') {
        return await this.getFromIndexedDB(id);
      }

      // Mode hybride : essayer l'API d'abord, puis local
      try {
        const apiTemplate = await templateApiService.getTemplate(id);
        if (apiTemplate) return apiTemplate;
      } catch (error) {
        console.warn('⚠️ [TEMPLATES] API inaccessible, tentative locale');
      }

      return await this.getFromIndexedDB(id);
    } catch (error) {
      console.error('❌ [TEMPLATES] Erreur getTemplate:', error);
      return null;
    }
  }

  /**
   * 🔍 Récupère depuis IndexedDB
   */
  async getFromIndexedDB(id) {
    try {
      await this.initDB();

      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(id);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const template = request.result;
          if (template) {
            console.log('✅ [TEMPLATES-LOCAL] Template récupéré localement:', id);
            resolve(template);
          } else {
            console.warn('⚠️ [TEMPLATES-LOCAL] Template non trouvé:', id);
            resolve(null);
          }
        };

        request.onerror = () => {
          console.error('❌ [TEMPLATES-LOCAL] Erreur getFromIndexedDB:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('❌ [TEMPLATES-LOCAL] Erreur getFromIndexedDB:', error);
      return null;
    }
  }

  /**
   * 🗑️ Supprime un template
   */
  async deleteTemplate(id) {
    const mode = this.userPreference;

    try {
      if (mode === 'api' || mode === 'hybrid') {
        try {
          await templateApiService.deleteTemplate(id);
          console.log("✅ [TEMPLATES-API] Template supprimé de l'API");
        } catch (error) {
          console.warn('⚠️ [TEMPLATES-API] Erreur suppression API:', error);
        }
      }

      if (mode === 'local' || mode === 'hybrid') {
        await this.deleteFromIndexedDB(id);
      }

      return true;
    } catch (error) {
      console.error('❌ [TEMPLATES] Erreur deleteTemplate:', error);
      throw error;
    }
  }

  /**
   * 🗑️ Supprime depuis IndexedDB
   */
  async deleteFromIndexedDB(id) {
    try {
      await this.initDB();

      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          console.log('✅ [TEMPLATES-LOCAL] Template supprimé localement:', id);
          resolve(true);
        };

        request.onerror = () => {
          console.error('❌ [TEMPLATES-LOCAL] Erreur deleteFromIndexedDB:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('❌ [TEMPLATES-LOCAL] Erreur deleteFromIndexedDB:', error);
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
      console.error('❌ [TEMPLATES] Erreur updateTemplate:', error);
      throw error;
    }
  }

  /**
   * 🖼️ Génère une miniature du template (même logique qu'avant)
   */
  async generateThumbnail(stageRef, options = {}) {
    try {
      const {
        width = 400,
        height = 300,
        quality = 0.9,
        docNode = null,
        canvasWidth = 800,
        canvasHeight = 600,
      } = options;

      if (!docNode) {
        console.warn('⚠️ [TEMPLATES] docNode non fourni - impossible de générer le thumbnail');
        return null;
      }

      const clone = docNode.clone({
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
      });

      clone.find('Transformer').forEach((t) => t.destroy());
      clone.find('Line').forEach((l) => {
        if (l.stroke() === '#FF00FF') {
          l.destroy();
        }
      });

      const container = document.createElement('div');
      const stage = new Konva.Stage({
        container,
        width: canvasWidth,
        height: canvasHeight,
      });
      const layer = new Konva.Layer();
      stage.add(layer);
      layer.add(clone);
      layer.draw();

      const dataURL = stage.toDataURL({
        pixelRatio: 2,
        mimeType: 'image/png',
        quality: 1.0,
      });

      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const scale = Math.min(width / canvasWidth, height / canvasHeight);
          const scaledWidth = Math.floor(canvasWidth * scale);
          const scaledHeight = Math.floor(canvasHeight * scale);

          const canvas = document.createElement('canvas');
          canvas.width = scaledWidth;
          canvas.height = scaledHeight;

          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, scaledWidth, scaledHeight);
          ctx.drawImage(img, 0, 0, scaledWidth, scaledHeight);

          resolve(canvas.toDataURL('image/png', quality));

          stage.destroy();
          container.remove();
        };

        img.onerror = () => {
          console.error('❌ [TEMPLATES] Erreur génération thumbnail');
          stage.destroy();
          container.remove();
          resolve(null);
        };

        img.src = dataURL;
      });
    } catch (error) {
      console.error('❌ [TEMPLATES] Erreur generateThumbnail:', error);
      return null;
    }
  }

  /**
   * 🔄 Dupliquer un template
   */
  async duplicateTemplate(id) {
    const mode = this.userPreference;

    try {
      if (mode === 'api' || mode === 'hybrid') {
        try {
          return await templateApiService.duplicateTemplate(id);
        } catch (error) {
          console.warn('⚠️ [TEMPLATES-API] Erreur duplication API, fallback local');
        }
      }

      // Fallback : duplication manuelle
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
      console.error('❌ [TEMPLATES] Erreur duplicateTemplate:', error);
      throw error;
    }
  }

  /**
   * 🔄 Synchronise les templates locaux vers l'API
   * Utile pour migrer les templates existants
   */
  async syncLocalToApi() {
    try {
      const localTemplates = await this.listFromIndexedDB();
      const results = {
        success: [],
        errors: [],
      };

      console.log(`🔄 [TEMPLATES] Synchronisation de ${localTemplates.length} templates...`);

      for (const template of localTemplates) {
        try {
          // Ne pas sync les templates déjà dans l'API
          if (template.source === 'api') {
            console.log(`⏭️ [TEMPLATES] Template déjà dans l'API:`, template.name);
            continue;
          }

          await templateApiService.syncLocalTemplate(template);
          results.success.push(template.name);
          console.log(`✅ [TEMPLATES] Synchronisé:`, template.name);
        } catch (error) {
          console.error(`❌ [TEMPLATES] Erreur sync ${template.name}:`, error);
          results.errors.push({ name: template.name, error: error.message });
        }
      }

      console.log('✅ [TEMPLATES] Synchronisation terminée:', results);
      return results;
    } catch (error) {
      console.error('❌ [TEMPLATES] Erreur syncLocalToApi:', error);
      throw error;
    }
  }

  /**
   * 📊 Statistiques des templates
   */
  async getStats() {
    const mode = this.userPreference;

    try {
      if (mode === 'api') {
        return await templateApiService.getStats();
      }

      if (mode === 'local') {
        return await this.getLocalStats();
      }

      // Mode hybride : combiner les stats
      const [localStats, apiStats] = await Promise.all([
        this.getLocalStats(),
        templateApiService.getStats().catch(() => null),
      ]);

      if (!apiStats) return localStats;

      return {
        total: localStats.total + apiStats.total,
        byCategory: {
          ...localStats.byCategory,
          ...Object.entries(apiStats.byCategory).reduce((acc, [cat, count]) => {
            acc[cat] = (localStats.byCategory[cat] || 0) + count;
            return acc;
          }, {}),
        },
        recentCount: localStats.recentCount + (apiStats.recentCount || 0),
        local: localStats.total,
        api: apiStats.total,
      };
    } catch (error) {
      console.error('❌ [TEMPLATES] Erreur getStats:', error);
      return { total: 0, byCategory: {}, recentCount: 0 };
    }
  }

  /**
   * 📊 Statistiques locales
   */
  async getLocalStats() {
    try {
      const templates = await this.listFromIndexedDB();

      const stats = {
        total: templates.length,
        byCategory: {},
        recentCount: 0,
      };

      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

      templates.forEach((template) => {
        stats.byCategory[template.category] = (stats.byCategory[template.category] || 0) + 1;

        if (template.createdAt > sevenDaysAgo) {
          stats.recentCount++;
        }
      });

      return stats;
    } catch (error) {
      console.error('❌ [TEMPLATES] Erreur getLocalStats:', error);
      return { total: 0, byCategory: {}, recentCount: 0 };
    }
  }
}

export default new TemplateService();
