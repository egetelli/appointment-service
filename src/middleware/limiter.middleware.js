const rateLimit = require("express-rate-limit");
const RedisStore = require("rate-limit-redis").default;
const redisClient = require("../config/redis");

// 1. Genel API Limitleyici (Dakikada en fazla 100 istek)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 100, // IP başına sınır
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Çok fazla istek gönderdiniz, lütfen 15 dakika sonra tekrar deneyin.",
  },
  store: new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args),
  }),
});

// 2. Auth Limitleyici (Giriş/Kayıt denemeleri için çok daha katı: 15 dakikada 150 deneme)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  message: {
    success: false,
    message: "Çok fazla giriş denemesi yaptınız. Lütfen biraz bekleyin.",
  },
  store: new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args),
  }),
});

module.exports = { apiLimiter, authLimiter };