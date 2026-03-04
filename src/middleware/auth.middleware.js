const jwt = require("jsonwebtoken");
const ErrorResponse = require("../utils/errorResponse");

/**
 * @desc JWT Kimlik Doğrulama Middleware
 */
const authenticate = (req, res, next) => {
  let token;

  // 1. Token'ın Header'dan gelip gelmediğini kontrol et
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  // Token yoksa hata fırlat
  if (!token) {
    return next(
      new ErrorResponse(
        "Bu sayfaya erişmek için yetkiniz yok (Token eksik)",
        401,
      ),
    );
  }

  try {
    // 2. Token'ı doğrula
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. Kullanıcı bilgisini request nesnesine ekle
    // Not: JWT üretilirken payload'da ne kullandıysak (userId) onu çağırmalıyız
    req.user = {
      id: decoded.userId || decoded.id,
      role: decoded.role,
    };

    next();
  } catch (err) {
    // 4. Hata tipine göre özel mesaj dön (Önemli!)
    if (err.name === "TokenExpiredError") {
      return next(
        new ErrorResponse(
          "Oturum süreniz doldu, lütfen tekrar giriş yapın",
          401,
        ),
      );
    }

    return next(new ErrorResponse("Geçersiz token, erişim reddedildi", 401));
  }
};

module.exports = authenticate;
