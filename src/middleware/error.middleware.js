const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  //Geliştirme aşamasında hatanın detayını terminalde görmek için
  logger.error(`[${new Date().toISOString()}] ❌ Hata: ${err.message}`);

  //Eğer hatanın özel bir kodu yoksa varsayılan 500(server error) verilir
  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message: err.message || "Sunucu hatası oluştu.",
    // Stack trace sadece development ortamında gösterilir, production'da gizlenir.
    stack: process.env.NODE_ENV === "development" ? err.stack : null,
    timestamp: new Date().toISOString(),
  });
};

module.exports = errorHandler;