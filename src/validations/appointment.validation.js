const { body } = require("express-validator");

const createAppointmentValidation = [
  body("serviceId")
    .isUUID().withMessage("Geçersiz hizmet ID formatı"),
    
  body("slotTime")
    .isISO8601().withMessage("Geçerli bir tarih formatı giriniz (ISO8601)")
    .custom((value) => {
      if (new Date(value) < new Date()) {
        throw new Error("Randevu zamanı geçmiş bir tarih olamaz");
      }
      return true;
    })
];

module.exports = { createAppointmentValidation };