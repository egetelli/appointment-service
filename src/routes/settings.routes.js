const express = require("express");
const router = express.Router();
const settingsController = require("../controllers/settings.controller");
const protect = require("../middleware/auth.middleware"); // JWT doğrulama middleware

/**
 * @swagger
 * tags:
 *   - name: Settings
 *     description: Uzman mesai, hizmet ve profil ayarları
 */

// Tüm ayar rotaları giriş yapmış olmayı gerektirir
router.use(protect);

/**
 * @swagger
 * /api/settings/schedule:
 *   post:
 *     summary: Mesai saatlerini günceller
 *     tags:
 *       - Settings
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: Güncellenecek mesai bilgileri
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               day:
 *                 type: string
 *               start:
 *                 type: string
 *               end:
 *                 type: string
 *             required:
 *               - day
 *               - start
 *               - end
 *     responses:
 *       200:
 *         description: Mesai kaydedildi
 *       400:
 *         description: Geçersiz veri
 */
router.post("/schedule", settingsController.saveSchedule);

/**
 * @swagger
 * /api/settings/services:
 *   post:
 *     summary: Hizmet listesini senkronize eder
 *     tags:
 *       - Settings
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: Hizmet listesi
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *               properties:
 *                 name:
 *                   type: string
 *                 duration:
 *                   type: integer
 *                 price:
 *                   type: number
 *               required:
 *                 - name
 *                 - duration
 *                 - price
 *     responses:
 *       200:
 *         description: Hizmetler güncellendi
 *       400:
 *         description: Geçersiz veri
 */
router.post("/services", settingsController.saveServices);

/**
 * @swagger
 * /api/settings/profile:
 *   post:
 *     summary: Profil bilgilerini günceller
 *     tags:
 *       - Settings
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: Güncellenecek profil bilgileri
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *             required:
 *               - name
 *               - email
 *     responses:
 *       200:
 *         description: Profil güncellendi
 *       400:
 *         description: Geçersiz veri
 */
router.post("/profile", settingsController.saveProfile);

/**
 * @swagger
 * /api/settings/all:
 *   get:
 *     summary: Tüm ayarları getirir
 *     tags:
 *       - Settings
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Başarılı, ayarlar döndü
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 schedule:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       day:
 *                         type: string
 *                       start:
 *                         type: string
 *                       end:
 *                         type: string
 *                 services:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       duration:
 *                         type: integer
 *                       price:
 *                         type: number
 *                 profile:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                       format: email
 *                     phone:
 *                       type: string
 *       401:
 *         description: Yetkisiz, token eksik veya geçersiz
 *       500:
 *         description: Sunucu hatası
 */
router.get("/all", protect, settingsController.getAllSettings);

module.exports = router;
