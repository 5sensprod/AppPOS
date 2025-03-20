// controllers/authController.js
const authService = require('../services/AuthService');
const ResponseHandler = require('../handlers/ResponseHandler');

async function loginUser(req, res) {
  try {
    const result = await authService.login(req.body.username, req.body.password);
    return result.success ? res.json(result) : res.status(401).json(result);
  } catch (error) {
    return ResponseHandler.error(res, error);
  }
}

async function registerUser(req, res) {
  try {
    const result = await authService.register(req.body);
    return res.status(201).json(result);
  } catch (error) {
    return ResponseHandler.error(res, error);
  }
}

function getCurrentUser(req, res) {
  return res.json({
    success: true,
    user: req.user,
  });
}

module.exports = {
  loginUser,
  registerUser,
  getCurrentUser,
};
