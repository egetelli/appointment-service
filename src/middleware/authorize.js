const ErrorResponse = require("../utils/errorResponse");

const authorize = (...roles) => {
  return (req, res, next) => {
    // 1. Kullanıcı objesi var mı kontrol et (authenticate'den geçmiş olması lazım)
    if (!req.user) {
      return next(new ErrorResponse("Yetkilendirme hatası: Kullanıcı bilgisi bulunamadı", 401));
    }

    // 2. Kullanıcının rolü izin verilen roller listesinde mi?
    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorResponse(
          `Erişim reddedildi: Bu işlem için ${req.user.role} yetkisi yeterli değil`, 
          403
        )
      );
    }
    
    next();
  };
};

module.exports = authorize;