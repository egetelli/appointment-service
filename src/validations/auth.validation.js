const { body } = require("express-validator");

// Shared password rules (future reuse)
const passwordRules = body("password")
  .notEmpty()
  .withMessage("Şifre alanı boş bırakılamaz")
  .isLength({ min: 6 })
  .withMessage("Şifre en az 6 karakter olmalıdır");

// Register Validation
const registerValidation = [
  body("full_name")
    .trim()
    .notEmpty()
    .withMessage("Ad Soyad alanı boş bırakılamaz")
    .isLength({ min: 3 })
    .withMessage("Ad Soyad en az 3 karakter olmalıdır"),

  body("email")
    .trim()
    .notEmpty()
    .withMessage("E-posta alanı boş bırakılamaz")
    .isEmail()
    .withMessage("Geçerli bir e-posta adresi giriniz")
    .normalizeEmail(),

  passwordRules,

  body("role")
    .optional() // Kullanıcı seçmezse backend zaten 'customer' atayacak
    .isIn(["customer", "provider"])
    .withMessage(
      "Geçersiz rol seçimi! Lütfen 'customer' veya 'provider' seçin.",
    ),
];

// Login Validation
const loginValidation = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("E-posta alanı boş bırakılamaz")
    .isEmail()
    .withMessage("Geçerli bir e-posta formatı giriniz")
    .normalizeEmail(),

  body("password").notEmpty().withMessage("Şifre alanı boş bırakılamaz"),
];

module.exports = {
  registerValidation,
  loginValidation,
};
