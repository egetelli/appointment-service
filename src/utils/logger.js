const winston = require("winston");
const path = require("path");

//Logların formatını belirliyoruz: [timestamp] [level]: message
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }), // Hata mesajlarında stack trace'i de ekle
  winston.format.splat(), // Birden fazla argümanla loglama yaparken düzgün formatlanmasını sağlar
  winston.format.json(), // Logları JSON formatında kaydetmek için
);

const logger = winston.createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: logFormat,
  transports: [
    // 1. Tüm hataları (error) 'logs/error.log' dosyasına yaz
    new winston.transports.File({
      filename: path.join("logs", "error.log"),
      level: "error",
    }),
    // 2. Tüm logları 'logs/combined.log' dosyasına yaz
    new winston.transports.File({
      filename: path.join("logs", "combined.log"),
    }),
  ],
});

// Eğer üretim ortamında değilsek, logları aynı zamanda konsola da renkli bas
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
