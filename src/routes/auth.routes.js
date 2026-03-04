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
router.post("/login", loginValidation, validate, authController.login);

module.exports = router;
