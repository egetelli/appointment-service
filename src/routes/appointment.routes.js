const express = require("express");
const router = express.Router();
const appointmentController = require("../controllers/appointment.controller");

const authenticate = require("../middleware/auth.middleware");
const authorize = require("../middleware/authorize.middleware");
const validate = require("../middleware/validate.middleware");
const {
  createAppointmentValidation,
} = require("../validations/appointment.validation");

/**
 * @swagger
 * tags:
 *   - name: Appointments
 *     description: Randevu yönetimi ve listeleme
 */

/**
 * @swagger
 * /api/appointments/services:
 *   get:
 *     summary: Sunulan hizmetleri listeler
 *     tags: [Appointments]
 *     responses:
 *       200:
 *         description: Hizmet listesi başarıyla getirildi
 */
router.get("/services", appointmentController.getServices);

/**
 * @swagger
 * /api/appointments/available-slots:
 *   get:
 *     summary: Müsait randevu saatlerini listeler
 *     tags: [Appointments]
 *     parameters:
 *       - in: query
 *         name: providerId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           example: "2026-03-15"
 *     responses:
 *       200:
 *         description: Müsait slot listesi
 */
router.get("/available-slots", appointmentController.getAvailableSlots);

/**
 * @swagger
 * /api/appointments/my:
 *   get:
 *     summary: Kullanıcının kendi randevularını getirir
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Randevu listesi başarıyla getirildi
 */
router.get(
  "/my",
  authenticate,
  authorize("customer", "admin"),
  appointmentController.getMyAppointments,
);

/**
 * @swagger
 * /api/appointments:
 *   post:
 *     summary: Yeni randevu oluşturur
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               providerId:
 *                 type: string
 *               serviceId:
 *                 type: string
 *               slotTime:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Randevu başarıyla oluşturuldu
 */
router.post(
  "/",
  authenticate,
  authorize("customer", "admin"),
  createAppointmentValidation,
  validate,
  appointmentController.bookAppointment,
);

/**
 * @swagger
 * /api/appointments/{id}/cancel:
 *   patch:
 *     summary: Randevuyu iptal eder
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Randevu iptal edildi
 */
router.patch(
  "/:id/cancel",
  authenticate,
  authorize("customer", "admin"),
  appointmentController.cancelAppointment,
);

/**
 * @swagger
 * /api/appointments/provider/schedule:
 *   get:
 *     summary: Çalışanın günlük ajandasını getirir
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Randevu listesi başarıyla getirildi
 */
router.get(
  "/provider/schedule",
  authenticate,
  authorize("provider", "admin"),
  appointmentController.getProviderSchedule,
);

/**
 * @swagger
 * /api/appointments/next-available:
 *   get:
 *     summary: En yakın müsait randevu tarihini bulur
 *     tags: [Appointments]
 *     parameters:
 *       - in: query
 *         name: providerId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: En yakın tarih verisi başarıyla getirildi
 */
router.get("/next-available", appointmentController.getNextAvailableSlot);

/**
 * @swagger
 * /api/appointments/stats/my-performance:
 *   get:
 *     summary: Çalışan performans istatistiklerini getirir
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: İstatistik verileri başarıyla getirildi
 */
router.get(
  "/stats/my-performance",
  authenticate,
  authorize("provider", "admin"),
  appointmentController.getMyPerformance,
);

/**
 * @swagger
 * /api/appointments/{id}/approve:
 *   patch:
 *     summary: Randevuyu onaylar
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Onaylanacak randevunun ID'si
 *         schema:
 *           type: string
 *           example: "8a7d3c5e-1c4f-4b9b-a8f7-9e6d7c1f2a3b"
 *     responses:
 *       200:
 *         description: Randevu başarıyla onaylandı
 *       404:
 *         description: Randevu bulunamadı
 */
router.patch(
  "/:id/approve",
  authenticate,
  authorize("provider", "admin"),
  appointmentController.approveAppointment,
);

module.exports = router;
