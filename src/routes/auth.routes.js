const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const {
  registerValidation,
  loginValidation,
} = require("../validations/auth.validation");
const validate = require("../middleware/validate.middleware");

/**
 * @swagger
 * tags:
 *   - name: Auth
 *     description: Kullanıcı kayıt ve giriş işlemleri
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Yeni kullanıcı kaydı
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               full_name:
 *                 type: string
 *                 example: "Ahmet Yılmaz"
 *               email:
 *                 type: string
 *                 example: "ahmet@test.com"
 *               password:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       201:
 *         description: Kullanıcı başarıyla oluşturuldu
 */
router.post("/register", registerValidation, validate, authController.register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Kullanıcı girişi
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: "ahmet@test.com"
 *               password:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Giriş başarılı
 */
router.post("/login", loginValidation, validate, authController.login);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Access Token yeniler
 *     description: HttpOnly çerezindeki Refresh Token'ı kullanarak yeni Access Token üretir.
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Yeni token başarıyla üretildi
 */
router.post("/refresh", authController.refreshToken);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Güvenli çıkış yapar
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Başarıyla çıkış yapıldı
 */
router.post("/logout", authController.logout);

module.exports = router;
