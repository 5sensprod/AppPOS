// services/AuthService.js
const { login, register } = require('../utils/auth');
const eventBus = require('../events/eventBus');

class AuthService {
  async login(username, password) {
    if (!username || !password) {
      throw { status: 400, message: "Nom d'utilisateur et mot de passe requis" };
    }

    const result = await login(username, password);
    if (result.success) {
      eventBus.emit('user:login', { username });
    }

    return result;
  }

  async register(userData) {
    const { username, password, role } = userData;

    if (!username || !password) {
      throw { status: 400, message: "Nom d'utilisateur et mot de passe requis" };
    }

    if (password.length < 8) {
      throw { status: 400, message: 'Le mot de passe doit contenir au moins 8 caractères' };
    }

    const result = await register({ username, password, role });

    if (result.success) {
      eventBus.emit('user:register', { username });
    }

    return result;
  }
}

module.exports = new AuthService();
