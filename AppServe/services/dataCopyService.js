// services/dataCopyService.js
const fs = require('fs');
const path = require('path');
const os = require('os');

class DataCopyService {
  constructor() {
    this.prodBasePath = path.join(os.homedir(), 'AppData', 'Roaming', 'AppPOS');
    this.devBasePath = process.cwd();

    this.entities = [
      'categories',
      'products',
      'brands',
      'suppliers',
      'sales',
      'drawer_sessions',
      'drawer_movements',
      'session_reports',
    ];
  }

  /**
   * Vérifie si les dossiers de production existent
   */
  checkProductionPaths() {
    const prodDataPath = path.join(this.prodBasePath, 'data');
    const prodPublicPath = path.join(this.prodBasePath, 'public');

    return {
      dataExists: fs.existsSync(prodDataPath),
      publicExists: fs.existsSync(prodPublicPath),
      prodDataPath,
      prodPublicPath,
    };
  }

  /**
   * Prépare les dossiers de destination en dev
   */
  ensureDevDirectories() {
    const devDataPath = path.join(this.devBasePath, 'data');
    const devPublicPath = path.join(this.devBasePath, 'public');

    if (!fs.existsSync(devDataPath)) {
      fs.mkdirSync(devDataPath, { recursive: true });
      console.log(`📁 Dossier créé: ${devDataPath}`);
    }

    if (!fs.existsSync(devPublicPath)) {
      fs.mkdirSync(devPublicPath, { recursive: true });
      console.log(`📁 Dossier créé: ${devPublicPath}`);
    }

    return { devDataPath, devPublicPath };
  }

  /**
   * Copie les bases de données NeDB
   */
  async copyDatabases() {
    const { dataExists, prodDataPath } = this.checkProductionPaths();

    if (!dataExists) {
      throw new Error(`Dossier de données de production non trouvé: ${prodDataPath}`);
    }

    const { devDataPath } = this.ensureDevDirectories();
    const results = [];

    console.log(`🔄 Copie des bases de données de ${prodDataPath} vers ${devDataPath}`);

    for (const entity of this.entities) {
      const sourceFile = path.join(prodDataPath, `${entity}.db`);
      const destFile = path.join(devDataPath, `${entity}.db`);

      try {
        if (fs.existsSync(sourceFile)) {
          // Faire une sauvegarde si le fichier existe déjà en dev
          if (fs.existsSync(destFile)) {
            const backupFile = path.join(devDataPath, `${entity}.db.backup.${Date.now()}`);
            fs.copyFileSync(destFile, backupFile);
            console.log(`💾 Sauvegarde: ${entity}.db -> ${path.basename(backupFile)}`);
          }

          // Copier le fichier
          fs.copyFileSync(sourceFile, destFile);

          const stats = fs.statSync(destFile);
          results.push({
            entity,
            success: true,
            size: `${(stats.size / 1024).toFixed(2)} KB`,
            source: sourceFile,
            destination: destFile,
          });

          console.log(`✅ ${entity}.db copié (${(stats.size / 1024).toFixed(2)} KB)`);
        } else {
          results.push({
            entity,
            success: false,
            error: 'Fichier source non trouvé',
            source: sourceFile,
          });
          console.log(`⚠️ ${entity}.db - Fichier source non trouvé`);
        }
      } catch (error) {
        results.push({
          entity,
          success: false,
          error: error.message,
          source: sourceFile,
        });
        console.error(`❌ Erreur copie ${entity}.db:`, error.message);
      }
    }

    return results;
  }

  /**
   * Copie les images des produits
   */
  async copyImages() {
    const { publicExists, prodPublicPath } = this.checkProductionPaths();

    if (!publicExists) {
      throw new Error(`Dossier public de production non trouvé: ${prodPublicPath}`);
    }

    const { devPublicPath } = this.ensureDevDirectories();
    const results = {
      totalFiles: 0,
      copiedFiles: 0,
      errors: [],
      details: [],
    };

    console.log(`🔄 Copie des images de ${prodPublicPath} vers ${devPublicPath}`);

    try {
      // Copier récursivement tout le contenu du dossier public
      await this.copyDirectoryRecursive(prodPublicPath, devPublicPath, results);

      console.log(`✅ Images copiées: ${results.copiedFiles}/${results.totalFiles} fichiers`);

      return results;
    } catch (error) {
      console.error(`❌ Erreur copie images:`, error.message);
      throw error;
    }
  }

  /**
   * Copie récursive d'un dossier
   */
  async copyDirectoryRecursive(source, destination, results) {
    if (!fs.existsSync(destination)) {
      fs.mkdirSync(destination, { recursive: true });
    }

    const items = fs.readdirSync(source);

    for (const item of items) {
      const sourcePath = path.join(source, item);
      const destPath = path.join(destination, item);
      const stats = fs.statSync(sourcePath);

      if (stats.isDirectory()) {
        // Copie récursive des sous-dossiers
        await this.copyDirectoryRecursive(sourcePath, destPath, results);
      } else {
        // Copie des fichiers
        try {
          results.totalFiles++;

          // Faire une sauvegarde si le fichier existe déjà
          if (fs.existsSync(destPath)) {
            const backupPath = `${destPath}.backup.${Date.now()}`;
            fs.copyFileSync(destPath, backupPath);
          }

          fs.copyFileSync(sourcePath, destPath);
          results.copiedFiles++;

          const fileStats = fs.statSync(destPath);
          results.details.push({
            file: path.relative(source, sourcePath),
            size: `${(fileStats.size / 1024).toFixed(2)} KB`,
            success: true,
          });
        } catch (error) {
          results.errors.push({
            file: path.relative(source, sourcePath),
            error: error.message,
          });
          console.error(`❌ Erreur copie ${item}:`, error.message);
        }
      }
    }
  }

  /**
   * Copie complète (bases de données + images)
   */
  async copyAll() {
    console.log('🚀 Début de la copie complète prod -> dev');

    const startTime = Date.now();
    const results = {
      databases: null,
      images: null,
      duration: 0,
      success: false,
    };

    try {
      // Vérifier les chemins de production
      const prodCheck = this.checkProductionPaths();
      console.log(
        `📍 Production - Data: ${prodCheck.dataExists ? '✅' : '❌'}, Public: ${prodCheck.publicExists ? '✅' : '❌'}`
      );

      // Copier les bases de données
      console.log('\n📊 === COPIE DES BASES DE DONNÉES ===');
      results.databases = await this.copyDatabases();

      // Copier les images
      console.log('\n🖼️ === COPIE DES IMAGES ===');
      results.images = await this.copyImages();

      results.duration = Date.now() - startTime;
      results.success = true;

      console.log(`\n🎉 Copie complète terminée en ${results.duration}ms`);
      console.log(
        `   - Bases de données: ${results.databases.filter((db) => db.success).length}/${results.databases.length}`
      );
      console.log(`   - Images: ${results.images.copiedFiles}/${results.images.totalFiles}`);

      return results;
    } catch (error) {
      results.duration = Date.now() - startTime;
      results.error = error.message;
      console.error(`❌ Erreur copie complète:`, error.message);
      throw error;
    }
  }

  /**
   * Obtient des statistiques sur les données
   */
  getDataStatistics() {
    const prodCheck = this.checkProductionPaths();
    const devDataPath = path.join(this.devBasePath, 'data');
    const devPublicPath = path.join(this.devBasePath, 'public');

    const stats = {
      production: {
        dataPath: prodCheck.prodDataPath,
        publicPath: prodCheck.prodPublicPath,
        dataExists: prodCheck.dataExists,
        publicExists: prodCheck.publicExists,
        databases: [],
      },
      development: {
        dataPath: devDataPath,
        publicPath: devPublicPath,
        dataExists: fs.existsSync(devDataPath),
        publicExists: fs.existsSync(devPublicPath),
        databases: [],
      },
    };

    // Statistiques des bases de données
    for (const entity of this.entities) {
      // Production
      const prodDbPath = path.join(prodCheck.prodDataPath, `${entity}.db`);
      const prodExists = fs.existsSync(prodDbPath);
      stats.production.databases.push({
        entity,
        exists: prodExists,
        size: prodExists ? `${(fs.statSync(prodDbPath).size / 1024).toFixed(2)} KB` : 'N/A',
        path: prodDbPath,
      });

      // Développement
      const devDbPath = path.join(devDataPath, `${entity}.db`);
      const devExists = fs.existsSync(devDbPath);
      stats.development.databases.push({
        entity,
        exists: devExists,
        size: devExists ? `${(fs.statSync(devDbPath).size / 1024).toFixed(2)} KB` : 'N/A',
        path: devDbPath,
      });
    }

    return stats;
  }
}

module.exports = new DataCopyService();
