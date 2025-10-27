// src/utils/FileManager.js - VERSION CORRIGÉE AVEC PATHMANAGER
const path = require('path');
const fs = require('fs').promises;
const pathManager = require('./PathManager');

/**
 * Classe utilitaire pour la gestion des fichiers
 * CORRIGÉ : Utilise PathManager pour la résolution des chemins
 */
class FileManager {
  /**
   * Vérifie si un fichier existe
   */
  static async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Supprime un fichier avec gestion des erreurs
   */
  static async deleteFile(filePath, logPrefix = '') {
    if (!filePath) return false;

    try {
      const exists = await this.fileExists(filePath);
      if (exists) {
        await fs.unlink(filePath);
        console.log(`${logPrefix} Fichier supprimé: ${filePath}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`${logPrefix} Erreur suppression fichier: ${filePath}`, error.message);
      return false;
    }
  }

  /**
   * ✅ CORRIGÉ : Construit un chemin dans le dossier public
   * Utilise PathManager au lieu de process.cwd()
   */
  static getPublicPath(...segments) {
    return path.join(pathManager.getPublicPath(), ...segments);
  }

  /**
   * Construit le chemin vers le répertoire d'une entité
   */
  static getEntityDir(entity, entityId) {
    return this.getPublicPath(entity, entityId);
  }

  /**
   * Extrait le nom de fichier d'un chemin ou URL
   */
  static extractFilename(pathOrUrl) {
    if (!pathOrUrl) return null;
    const parts = pathOrUrl.split('/');
    return parts[parts.length - 1];
  }

  /**
   * Construit un chemin alternatif pour un fichier
   */
  static getAlternativePath(entity, entityId, originalPath, src) {
    if (src) {
      const fileName = this.extractFilename(src);
      return this.getPublicPath(entity, entityId, fileName);
    }
    return null;
  }

  /**
   * Supprime un répertoire
   */
  static async deleteDirectory(dirPath, logPrefix = '') {
    try {
      const exists = await this.fileExists(dirPath);
      if (exists) {
        await fs.rm(dirPath, { recursive: true, force: true });
        console.log(`${logPrefix} Répertoire supprimé: ${dirPath}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`${logPrefix} Erreur suppression répertoire: ${dirPath}`, error.message);
      return false;
    }
  }

  /**
   * Liste les fichiers d'un répertoire
   */
  static async listFiles(dirPath) {
    try {
      return await fs.readdir(dirPath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }
}

module.exports = FileManager;
