const express = require("express");
const router = express.Router();
const appointmentController = require("../controllers/appointment.controller");

const authenticate = require("../middleware/auth.middleware");
const authorize = require("../middleware/authorize");
const validate = require("../middleware/validate.middleware");
const {
  createAppointmentValidation,
} = require("../validations/appointment.validation");

// 1. Herkese açık: Hizmetleri listele
router.get("/services", appointmentController.getServices);

// 1.5 Herkese açık: Çalışanın müsaitlik durumunu gör
router.get("/available-slots", appointmentController.getAvailableSlots);

// 2. Korumalı: Kendi randevularımı gör (user yerine customer oldu)
router.get(
  "/my",
  authenticate,
  authorize("customer", "admin"),
  appointmentController.getMyAppointments,
);

// 3. Korumalı & Validasyonlu: Randevu al
router.post(
  "/",
  authenticate,
  authorize("customer", "admin"),
  createAppointmentValidation,
  validate,
  appointmentController.bookAppointment,
);

// 4. Korumalı: Randevu iptal et (Soft Delete mantığı)
router.patch(
  "/:id/cancel",
  authenticate,
  authorize("customer", "admin"),
  appointmentController.cancelAppointment,
);

// 5. Çalışanın (Provider) kendi günlük ajandasını görmesi
router.get(
  "/provider/schedule",
  authenticate,
  authorize("provider", "admin"),
  appointmentController.getProviderSchedule,
);

// 6. En yakın müsait randevu slotunu bul
router.get("/next-available", appointmentController.getNextAvailableSlot);

// 7. Kullanıcının performans istatistiklerini görmesi
router.get(
  "/stats/my-performance",
  authenticate,
  authorize("provider", "admin"),
  appointmentController.getMyPerformance,
);

module.exports = router;
