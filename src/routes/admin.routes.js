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

// --- KULLANICI (USER) YÖNETİMİ ---
router.get(
  "/users",
  authenticate,
  authorize("admin"),
  adminController.getUsers,
);
router.post(
  "/users",
  authenticate,
  authorize("admin"),
  adminController.createUser,
);
router.put(
  "/users/:id",
  authenticate,
  authorize("admin"),
  adminController.updateUser,
);
router.delete(
  "/users/:id",
  authenticate,
  authorize("admin"),
  adminController.deleteUser,
);

// --- SERVİS (HİZMET) YÖNETİMİ (Bir uzmana ait servisler) ---
router.get(
  "/providers/:id/services",
  authenticate,
  authorize("admin"),
  adminController.getProviderServices,
);

// HATA BURADAYDI! createService yerine controller'daki gerçek adını yazdık
router.post(
  "/providers/:id/services",
  authenticate,
  authorize("admin"),
  adminController.createOrUpdateService,
);

// HATA BURADAYDI! updateService yerine controller'daki gerçek adını yazdık
router.put(
  "/services/:serviceId",
  authenticate,
  authorize("admin"),
  adminController.createOrUpdateService,
);

router.delete(
  "/services/:serviceId",
  authenticate,
  authorize("admin"),
  adminController.deleteService,
);

// --- ÇALIŞMA SAATLERİ (WORKING HOURS) ---
router.get(
  "/providers/:id/working-hours",
  authenticate,
  authorize("admin"),
  adminController.getWorkingHours,
);
router.put(
  "/providers/:id/working-hours",
  authenticate,
  authorize("admin"),
  adminController.updateWorkingHours,
);

router.get(
  "/appointments",
  authenticate,
  authorize("admin"),
  adminController.getAppointments,
);


module.exports = router;
