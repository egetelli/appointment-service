const express = require("express");
const router = express.Router();
const serviceController = require("../controllers/service.controller");
const authenticate = require("../middleware/auth.middleware"); 
const authorize = require("../middleware/authorize.middleware"); 

/**
 * @swagger
 * tags:
 *   name: Services
 *   description: Randevu alınabilecek hizmetlerin yönetimi
 */

/**
 * @swagger
 * /api/services:
 *   get:
 *     summary: Tüm aktif hizmetleri listeler
 *     tags: [Services]
 *     responses:
 *       200:
 *         description: Hizmet listesi başarıyla getirildi
 *       500:
 *         description: Sunucu hatası
 *   post:
 *     summary: Yeni bir hizmet oluşturur
 *     tags: [Services]
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
 *               - duration_minutes
 *               - base_price
 *             properties:
 *               name:
 *                 type: string
 *                 example: Klasik Saç Kesimi
 *               description:
 *                 type: string
 *                 example: Yıkama ve fön dahil
 *               duration_minutes:
 *                 type: integer
 *                 example: 45
 *               base_price:
 *                 type: number
 *                 example: 250
 *     responses:
 *       201:
 *         description: Hizmet oluşturuldu
 *       400:
 *         description: Geçersiz veri
 *       401:
 *         description: Yetkisiz erişim
 */

router.get("/", serviceController.getActiveServices);

router.post(
  "/",
  authenticate,
  authorize("admin"),
  serviceController.createService
);

/**
 * @swagger
 * /api/services/{id}:
 *   put:
 *     summary: Mevcut bir hizmeti günceller
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Hizmet ID
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               duration_minutes:
 *                 type: integer
 *               base_price:
 *                 type: number
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Güncelleme başarılı
 *       404:
 *         description: Hizmet bulunamadı
 *   delete:
 *     summary: Bir hizmeti pasife çeker (Soft Delete)
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Hizmet ID
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Hizmet pasife alındı
 *       404:
 *         description: Hizmet bulunamadı
 */

router.put(
  "/:id",
  authenticate,
  authorize("admin"),
  serviceController.updateService
);

router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  serviceController.deleteService
);

module.exports = router;