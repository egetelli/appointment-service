const { body } = require("express-validator");

// Shared password rules (future reuse)
const passwordRules = body("password")
  .notEmpty()
  .withMessage("Şifre alanı boş bırakılamaz")
  .isLength({ min: 6 })
  .withMessage("Şifre en az 6 karakter olmalıdır");

// Register Validation
const registerValidation = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("E-posta alanı boş bırakılamaz")
    .isEmail()
    .withMessage("Geçerli bir e-posta adresi giriniz")
    .normalizeEmail(),

  passwordRules,
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
