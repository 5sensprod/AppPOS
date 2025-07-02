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
   * Copie les bases de données NeDB (prod -> dev)
   */
  async copyDatabases() {
    return this.copyDatabasesDirection('prod-to-dev');
  }

  /**
   * Copie les bases de données NeDB (dev -> prod)
   */
  async copyDatabasesReverse() {
    return this.copyDatabasesDirection('dev-to-prod');
  }

  /**
   * Copie les bases de données dans la direction spécifiée
   */
  async copyDatabasesDirection(direction) {
    let sourceDataPath, destDataPath, directionLabel;

    if (direction === 'prod-to-dev') {
      const { dataExists, prodDataPath } = this.checkProductionPaths();
      if (!dataExists) {
        throw new Error(`Dossier de données de production non trouvé: ${prodDataPath}`);
      }
      sourceDataPath = prodDataPath;
      const { devDataPath } = this.ensureDevDirectories();
      destDataPath = devDataPath;
      directionLabel = 'PROD → DEV';
    } else {
      const devDataPath = path.join(this.devBasePath, 'data');
      if (!fs.existsSync(devDataPath)) {
        throw new Error(`Dossier de données de développement non trouvé: ${devDataPath}`);
      }
      sourceDataPath = devDataPath;
      destDataPath = path.join(this.prodBasePath, 'data');
      // Créer le dossier de destination si nécessaire
      if (!fs.existsSync(destDataPath)) {
        fs.mkdirSync(destDataPath, { recursive: true });
        console.log(`📁 Dossier créé: ${destDataPath}`);
      }
      directionLabel = 'DEV → PROD';
    }

    const results = [];
    console.log(
      `🔄 Copie des bases de données ${directionLabel}: ${sourceDataPath} vers ${destDataPath}`
    );

    for (const entity of this.entities) {
      const sourceFile = path.join(sourceDataPath, `${entity}.db`);
      const destFile = path.join(destDataPath, `${entity}.db`);

      try {
        if (fs.existsSync(sourceFile)) {
          // Faire une sauvegarde si le fichier existe déjà
          if (fs.existsSync(destFile)) {
            const backupFile = path.join(destDataPath, `${entity}.db.backup.${Date.now()}`);
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
            direction: directionLabel,
          });

          console.log(`✅ ${entity}.db copié (${(stats.size / 1024).toFixed(2)} KB)`);
        } else {
          results.push({
            entity,
            success: false,
            error: 'Fichier source non trouvé',
            source: sourceFile,
            direction: directionLabel,
          });
          console.log(`⚠️ ${entity}.db - Fichier source non trouvé`);
        }
      } catch (error) {
        results.push({
          entity,
          success: false,
          error: error.message,
          source: sourceFile,
          direction: directionLabel,
        });
        console.error(`❌ Erreur copie ${entity}.db:`, error.message);
      }
    }

    return results;
  }

  /**
   * Copie les images des produits (prod -> dev)
   */
  async copyImages() {
    return this.copyImagesDirection('prod-to-dev');
  }

  /**
   * Copie les images des produits (dev -> prod)
   */
  async copyImagesReverse() {
    return this.copyImagesDirection('dev-to-prod');
  }

  /**
   * Copie les images dans la direction spécifiée
   */
  async copyImagesDirection(direction) {
    let sourcePublicPath, destPublicPath, directionLabel;

    if (direction === 'prod-to-dev') {
      const { publicExists, prodPublicPath } = this.checkProductionPaths();
      if (!publicExists) {
        throw new Error(`Dossier public de production non trouvé: ${prodPublicPath}`);
      }
      sourcePublicPath = prodPublicPath;
      const { devPublicPath } = this.ensureDevDirectories();
      destPublicPath = devPublicPath;
      directionLabel = 'PROD → DEV';
    } else {
      const devPublicPath = path.join(this.devBasePath, 'public');
      if (!fs.existsSync(devPublicPath)) {
        throw new Error(`Dossier public de développement non trouvé: ${devPublicPath}`);
      }
      sourcePublicPath = devPublicPath;
      destPublicPath = path.join(this.prodBasePath, 'public');
      // Créer le dossier de destination si nécessaire
      if (!fs.existsSync(destPublicPath)) {
        fs.mkdirSync(destPublicPath, { recursive: true });
        console.log(`📁 Dossier créé: ${destPublicPath}`);
      }
      directionLabel = 'DEV → PROD';
    }

    const results = {
      totalFiles: 0,
      copiedFiles: 0,
      errors: [],
      details: [],
      direction: directionLabel,
    };

    console.log(
      `🔄 Copie des images ${directionLabel}: ${sourcePublicPath} vers ${destPublicPath}`
    );

    try {
      // Copier récursivement tout le contenu du dossier public
      await this.copyDirectoryRecursive(sourcePublicPath, destPublicPath, results);

      console.log(
        `✅ Images copiées ${directionLabel}: ${results.copiedFiles}/${results.totalFiles} fichiers`
      );

      return results;
    } catch (error) {
      console.error(`❌ Erreur copie images ${directionLabel}:`, error.message);
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
   * Copie complète (bases de données + images) - prod vers dev
   */
  async copyAll() {
    return this.copyAllDirection('prod-to-dev');
  }

  /**
   * Copie complète (bases de données + images) - dev vers prod
   */
  async copyAllReverse() {
    return this.copyAllDirection('dev-to-prod');
  }

  /**
   * Copie complète dans la direction spécifiée
   */
  async copyAllDirection(direction) {
    const directionLabel = direction === 'prod-to-dev' ? 'PROD → DEV' : 'DEV → PROD';
    console.log(`🚀 Début de la copie complète ${directionLabel}`);

    const startTime = Date.now();
    const results = {
      databases: null,
      images: null,
      duration: 0,
      success: false,
      direction: directionLabel,
    };

    try {
      // Vérifier les chemins selon la direction
      if (direction === 'prod-to-dev') {
        const prodCheck = this.checkProductionPaths();
        console.log(
          `📍 Production - Data: ${prodCheck.dataExists ? '✅' : '❌'}, Public: ${prodCheck.publicExists ? '✅' : '❌'}`
        );
      } else {
        const devDataPath = path.join(this.devBasePath, 'data');
        const devPublicPath = path.join(this.devBasePath, 'public');
        const devDataExists = fs.existsSync(devDataPath);
        const devPublicExists = fs.existsSync(devPublicPath);
        console.log(
          `📍 Développement - Data: ${devDataExists ? '✅' : '❌'}, Public: ${devPublicExists ? '✅' : '❌'}`
        );
      }

      // Copier les bases de données
      console.log(`\n📊 === COPIE DES BASES DE DONNÉES ${directionLabel} ===`);
      results.databases = await this.copyDatabasesDirection(direction);

      // Copier les images
      console.log(`\n🖼️ === COPIE DES IMAGES ${directionLabel} ===`);
      results.images = await this.copyImagesDirection(direction);

      results.duration = Date.now() - startTime;
      results.success = true;

      console.log(`\n🎉 Copie complète ${directionLabel} terminée en ${results.duration}ms`);
      console.log(
        `   - Bases de données: ${results.databases.filter((db) => db.success).length}/${results.databases.length}`
      );
      console.log(`   - Images: ${results.images.copiedFiles}/${results.images.totalFiles}`);

      return results;
    } catch (error) {
      results.duration = Date.now() - startTime;
      results.error = error.message;
      console.error(`❌ Erreur copie complète ${directionLabel}:`, error.message);
      throw error;
    }
  }

  /**
   * Vérifications pour la copie inverse (dev -> prod)
   */
  checkDevelopmentPaths() {
    const devDataPath = path.join(this.devBasePath, 'data');
    const devPublicPath = path.join(this.devBasePath, 'public');

    return {
      dataExists: fs.existsSync(devDataPath),
      publicExists: fs.existsSync(devPublicPath),
      devDataPath,
      devPublicPath,
    };
  }
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
