const { validationResult } = require("express-validator");
const ErrorResponse = require("../utils/errorResponse");
const logger = require('../utils/logger');

const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    // 🔍 BURASI ÇOK KRİTİK: Hatanın köküne ineceğiz
    logger.info("❌ VALIDASYON DETAYLI ANALİZ:");
    errors.array().forEach((err) => {
      logger.info(`- Alan: ${err.path}`);
      logger.info(`- Gelen Değer: "${err.value}" (Tipi: ${typeof err.value})`);
      logger.info(`- Hata Mesajı: ${err.msg}`);
    });

    const extractedErrors = errors
      .array()
      .map((err) => err.msg)
      .join(", ");
    return next(new ErrorResponse(`Doğrulama Hatası: ${extractedErrors}`, 400));
  }
  next();
};

module.exports = validate;
