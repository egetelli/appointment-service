const express = require("express");
const router = express.Router();
const providerController = require("../controllers/provider.controller");
const authenticate = require("../middleware/auth.middleware");
const authorize = require("../middleware/authorize.middleware");

/**
 * @swagger
 * tags:
 *   name: Providers
 *   description: Uzmanların ve verdikleri hizmetlerin yönetimi
 */

/**
 * @swagger
 * /api/providers:
 *   get:
 *     summary: Tüm uzmanları listeler
 *     tags: [Providers]
 *     responses:
 *       200:
 *         description: Uzman listesi getirildi
 *       500:
 *         description: Sunucu hatası
 *   post:
 *     summary: Yeni bir uzman oluşturur
 *     tags: [Providers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - title
 *             properties:
 *               user_id:
 *                 type: string
 *                 format: uuid
 *                 description: Opsiyonel kullanıcı bağlantısı
 *               name:
 *                 type: string
 *                 example: Ahmet Yılmaz
 *               title:
 *                 type: string
 *                 example: Kıdemli Berber
 *     responses:
 *       201:
 *         description: Uzman oluşturuldu
 *       400:
 *         description: Geçersiz veri
 *       401:
 *         description: Yetkisiz erişim
 */

router.get("/", providerController.getProviders);

// GET /api/providers/:id/services
router.get("/:id/services", providerController.getProviderServices);

router.post(
  "/",
  authenticate,
  authorize("admin"),
  providerController.createProvider,
);

/**
 * @swagger
 * /api/providers/{id}/services:
 *   post:
 *     summary: Bir uzmana hizmet atar veya fiyat günceller
 *     tags: [Providers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Provider ID
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - service_id
 *             properties:
 *               service_id:
 *                 type: string
 *                 format: uuid
 *               custom_price:
 *                 type: number
 *                 example: 300
 *                 description: Uzmana özel fiyat
 *     responses:
 *       200:
 *         description: Hizmet ataması başarılı
 *       404:
 *         description: Provider veya Service bulunamadı
 */

router.post(
  "/:id/services",
  authenticate,
  authorize("admin"),
  providerController.assignService,
);

module.exports = router;
