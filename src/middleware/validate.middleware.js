const { validationResult } = require("express-validator");
const ErrorResponse = require("../utils/errorResponse");

const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    // 🔍 BURASI ÇOK KRİTİK: Hatanın köküne ineceğiz
    console.log("❌ VALIDASYON DETAYLI ANALİZ:");
    errors.array().forEach((err) => {
      console.log(`- Alan: ${err.path}`);
      console.log(`- Gelen Değer: "${err.value}" (Tipi: ${typeof err.value})`);
      console.log(`- Hata Mesajı: ${err.msg}`);
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
