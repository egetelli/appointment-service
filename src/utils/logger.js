const winston = require("winston");
const path = require("path");

// Log formatı aynı kalıyor...
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json(),
);

// LOG KLASÖRÜNÜ SABİTLEME (Mutlak Yol)
// __dirname şu an: C:\...\src\utils
// path.resolve ile 2 üst klasöre çıkıp (root) logs klasörünü hedefliyoruz.
const logDir = path.resolve(__dirname, "../../logs");

const logger = winston.createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: logFormat,
  transports: [
    // 1. Hata logları
    new winston.transports.File({
      filename: path.join(logDir, "error.log"), // Artik tam yol: .../appointment-service/logs/error.log
      level: "error",
    }),
    // 2. Tüm loglar
    new winston.transports.File({
      filename: path.join(logDir, "combined.log"),
    }),
  ],
});

if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
      ),
    }),
  );
}

module.exports = logger;
