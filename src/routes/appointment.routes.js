const express = require("express");
const router = express.Router();
const appointmentController = require("../controllers/appointment.controller");

// Middleware'ler
const authenticate = require("../middleware/auth.middleware");
const validate = require("../middleware/validate.middleware");
const {
  createAppointmentValidation,
} = require("../validations/appointment.validation");

// 1. Herkese açık: Hizmetleri listele
router.get("/services", appointmentController.getServices);

// 1.5 Herkese açık: Çalışanın müsaitlik durumunu gör
router.get("/available-slots", appointmentController.getAvailableSlots);

// 2. Korumalı: Kendi randevularımı gör
router.get("/my", authenticate, appointmentController.getMyAppointments);

// 3. Korumalı & Validasyonlu: Randevu al
router.post(
  "/",
  authenticate,
  createAppointmentValidation,
  validate,
  appointmentController.bookAppointment,
);

module.exports = router;
