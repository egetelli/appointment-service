const { body } = require("express-validator");

const createAppointmentValidation = [
  // 1. Provider ID Kontrolü
  body("providerId")
    .exists()
    .withMessage("providerId alanı zorunludur.")
    .trim() // Varsa sağdaki soldaki görünmez boşlukları temizler
    .isUUID("all")
    .withMessage("Geçerli bir çalışan (provider) seçmelisiniz."),

  // 2. Service ID Kontrolü
  body("serviceId")
    .exists()
    .withMessage("serviceId alanı zorunludur.")
    .trim()
    .isUUID("all")
    .withMessage("Geçersiz hizmet ID formatı."),

  // 3. Zaman Kontrolü
  body("slotTime")
    .isISO8601()
    .withMessage("Geçerli bir tarih formatı giriniz (ISO8601)."),
];

module.exports = { createAppointmentValidation };
