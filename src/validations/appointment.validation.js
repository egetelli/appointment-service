const { body } = require("express-validator");

const createAppointmentValidation = [
  // 1. Provider ID Kontrolü (Her iki senaryoda da ZORUNLU)
  body("providerId")
    .exists()
    .withMessage("providerId alanı zorunludur.")
    .trim() // Varsa sağdaki soldaki görünmez boşlukları temizler
    .isUUID("all")
    .withMessage("Geçerli bir çalışan (provider) seçmelisiniz."),

  // 2. Service ID Kontrolü (Her iki senaryoda da ZORUNLU)
  body("serviceId")
    .exists()
    .withMessage("serviceId alanı zorunludur.")
    .trim()
    .isUUID("all")
    .withMessage("Geçersiz hizmet ID formatı."),

  // 3. Zaman Kontrolü (Her iki senaryoda da ZORUNLU)
  body("slotTime")
    .isISO8601()
    .withMessage("Geçerli bir tarih formatı giriniz (ISO8601)."),

  // 👇 YENİ EKLENEN OPSİYONEL ALANLAR (Normal müşteriyi ASLA bozmaz) 👇

  // Manuel randevularda body'den gelir, normal müşteride gelmez (token'dan alınır)
  body("userId").optional({ nullable: true }),

  // Misafir randevusu ise gelir, normal müşteride gelmez
  body("guestName")
    .optional({ nullable: true })
    .isString()
    .withMessage("Misafir adı metin formatında olmalıdır."),

  // Manuel randevuda 'booked' olarak gelir, normal müşteride gelmez (veritabanı 'pending' yapar)
  body("status").optional({ nullable: true }).isString(),
];

module.exports = { createAppointmentValidation };
