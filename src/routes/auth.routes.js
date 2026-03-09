const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");

// Doğrulama araçlarımızı import ediyoruz
const {
  registerValidation,
  loginValidation,
} = require("../validations/auth.validation");
const validate = require("../middleware/validate.middleware");

// POST /api/auth/register
// Akış: İstek Gelir -> Kurallar Kontrol Edilir -> Hata Varsa Yakalanır -> Sorun Yoksa Controller Çalışır
router.post("/register", registerValidation, validate, authController.register);

// POST /api/auth/login
// Akış: İstek Gelir -> Kurallar Kontrol Edilir -> Sorun Yoksa Controller (Access RAM'e, Refresh Cookie'ye) Çalışır
router.post("/login", loginValidation, validate, authController.login);

// 👇 YENİ EKLENEN ROTALAR 👇

// POST /api/auth/refresh
// Access token süresi bittiğinde, tarayıcının otomatik gönderdiği HttpOnly Cookie ile yeni Access Token üretir.
// (Burada validate kullanmıyoruz çünkü body'den veri beklemiyoruz, sadece cookie okuyoruz)
router.post("/refresh", authController.refreshToken);

// POST /api/auth/logout
// Çıkış yap (Hem veritabanından token'ı siler, hem de tarayıcıdaki Cookie'yi temizler)
router.post("/logout", authController.logout);

module.exports = router;
