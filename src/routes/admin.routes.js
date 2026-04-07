const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin.controller");

// Senin mevcut middleware'lerin
const authenticate = require("../middleware/auth.middleware");
const authorize = require("../middleware/authorize.middleware");

/**
 * @swagger
 * tags:
 *   - name: Admin
 *     description: Sistem genel istatistikleri ve yönetim paneli
 */

/**
 * @swagger
 * /api/admin/dashboard:
 *   get:
 *     summary: Admin kontrol paneli için özet istatistikleri getirir
 *     tags:
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard verileri başarıyla getirildi
 *       401:
 *         description: Yetkisiz erişim (Token yok veya geçersiz)
 *       403:
 *         description: Yetki reddedildi (Sadece admin erişebilir)
 *       500:
 *         description: Sunucu hatası
 */
router.get(
  "/dashboard",
  authenticate,
  authorize("admin"), // SADECE admin rolüne sahip olanlar girebilir
  adminController.getDashboard,
);

// İleride buraya adminlerin yapabileceği diğer işlemler eklenebilir
// Örn: router.delete("/users/:id", authenticate, authorize("admin"), adminController.deleteUser);

module.exports = router;
