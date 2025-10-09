// src/services/userService.js
import apiService from './api';

class UserService {
  constructor() {
    this.baseEndpoint = '/api/users';
  }

  /**
   * Récupérer tous les utilisateurs
   */
  async getAllUsers() {
    try {
      const response = await apiService.get(this.baseEndpoint);
      return response.data;
    } catch (error) {
      console.error('Erreur récupération utilisateurs:', error);
      throw error;
    }
  }

  /**
   * Récupérer un utilisateur par ID
   */
  async getUserById(userId) {
    try {
      const response = await apiService.get(`${this.baseEndpoint}/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Erreur récupération utilisateur:', error);
      throw error;
    }
  }

  /**
   * Créer un nouvel utilisateur
   */
  async createUser(userData) {
    try {
      const response = await apiService.post(this.baseEndpoint, userData);
      return response.data;
    } catch (error) {
      console.error('Erreur création utilisateur:', error);
      throw error;
    }
  }

  /**
   * Mettre à jour un utilisateur
   */
  async updateUser(userId, userData) {
    try {
      const response = await apiService.put(`${this.baseEndpoint}/${userId}`, userData);
      return response.data;
    } catch (error) {
      console.error('Erreur mise à jour utilisateur:', error);
      throw error;
    }
  }

  /**
   * Changer le mot de passe d'un utilisateur
   */
  async changePassword(userId, newPassword) {
    try {
      const response = await apiService.put(`${this.baseEndpoint}/${userId}/password`, {
        newPassword,
      });
      return response.data;
    } catch (error) {
      console.error('Erreur changement mot de passe:', error);
      throw error;
    }
  }

  /**
   * Supprimer un utilisateur
   */
  async deleteUser(userId) {
    try {
      const response = await apiService.delete(`${this.baseEndpoint}/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Erreur suppression utilisateur:', error);
      throw error;
    }
  }
}

export default new UserService();
