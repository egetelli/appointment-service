// src/controllers/auth.controller.js

const authService = require("../services/auth.service");
const asyncHandler = require("../middleware/asyncHandler");
const ErrorResponse = require("../utils/errorResponse"); // 1. Eklendi

/**
 * @desc  Register new user
 * @route POST /api/auth/register
 * @access Public
 */
const register = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Input validation can be added via express-validator in routes
  const user = await authService.register(email, password);

  // Future: Publish event to RabbitMQ for user.created.v1
  // await eventService.publish('user.registered.v1', { userId: user.id, email: user.email });

  res.status(201).json({
    success: true,
    message: "Kullanıcı başarıyla oluşturuldu.",
    data: {
      id: user.id,
      email: user.email,
      role: user.role
    }
  });
});

/**
 * @desc  Login user
 * @route POST /api/auth/login
 * @access Public
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const result = await authService.login(email, password);

  res.status(200).json({
    success: true,
    message: "Giriş başarılı.",
    data: result // { token, user }
  });
});

/**
 * @desc  Refresh JWT token (optional, for future scaling)
 * @route POST /api/auth/refresh
 * @access Public (if you implement stateless refresh)
 */
const refreshToken = asyncHandler(async (req, res) => {
  const { token } = req.body;
  
  // 2. Güncellendi: Artık kendi özel hata sınıfımızı ve 400 (Bad Request) kodunu kullanıyoruz
  if (!token) throw new ErrorResponse("Refresh token gereklidir", 400); 

  // TODO: verify old token and issue new JWT
  // const newToken = await authService.refreshToken(token);

  res.status(200).json({
    success: true,
    message: "Yeni token oluşturuldu.",
    data: {
      token: "TODO" // replace with newToken
    }
  });
});

module.exports = {
  register,
  login,
  refreshToken, 
};