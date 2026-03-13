const jwt = require("jsonwebtoken");
const ErrorResponse = require("../utils/errorResponse");
const db = require("../config/db"); // Veritabanı bağlantın

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(
        new ErrorResponse("Yetkilendirme hatası: Kullanıcı bulunamadı", 401),
      );
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorResponse(
          `Erişim reddedildi: ${req.user.role} rolü bu işlem için yetkili değil`,
          403,
        ),
      );
    }
    next();
  };
};

module.exports = authorize;
