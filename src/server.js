require("dotenv").config();
const http = require("http"); // 👈 1. HTTP modülünü ekledik
const app = require("./app");
const pool = require("./config/db");
const dbInit = require("./config/dbInit");

const rabbitMQ = require("./config/rabbitmq");
const redisClient = require("./config/redis");
const socketLib = require("./config/socket"); // 👈 2. Socket yapılandırmasını ekledik
const logger = require("./utils/logger");

const PORT = process.env.PORT || 3000;

// Express app'i bir HTTP sunucusu içine sarıyoruz
const server = http.createServer(app); // 👈 3. Kritik Değişiklik

const startServer = async () => {
  try {
    // 1. PostgreSQL bağlantısı
    await pool.query("SELECT NOW()");
    logger.info("🐘 [PostgreSQL] Veritabanı bağlantısı başarılı.");

    // 2. Tablo kontrolleri
    await dbInit();

    // 3. Redis Bağlantısı
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
    await redisClient.ping();
    logger.info("⚡ [REDIS] Önbellek bağlantısı başarılı.");

    // 4. RabbitMQ Bağlantısı
    await rabbitMQ.connect();

    // 5. Socket.io Başlatma 👈 4. Yeni Adım
    // Sunucu nesnesini soket kütüphanesine veriyoruz
    socketLib.init(server);
    logger.info("📡 [Socket.io] Gerçek zamanlı haberleşme hazır.");

    // 6. Sunucuyu Başlat (Artık 'app' değil 'server' dinliyor)
    server.listen(PORT, () => {
      // 👈 5. Kritik Değişiklik
      logger.info(`🚀 [API] Sunucu port ${PORT} üzerinde çalışıyor...`);
      logger.info(`🌍 [Ortam] ${process.env.NODE_ENV || "development"}`);
    });

    require("./jobs/reminder.job");

    return server;
  } catch (err) {
    logger.error("❌ Başlatma hatası:", err.message);
    process.exit(1);
  }
};

startServer();

// --- Hata Yönetimi ---
process.on("unhandledRejection", (err) => {
  logger.error("❌ Unhandled Rejection:", err.message);
  if (server && server.listening) {
    server.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
});

process.on("uncaughtException", (err) => {
  logger.error("💥 Uncaught Exception:", err.message);
  process.exit(1);
});

// --- Graceful Shutdown (Zarif Kapatma) ---
const shutdown = async () => {
  logger.info("\n👋 Sunucu zarif bir şekilde kapatılıyor...");
  try {
    // 1. Soket bağlantılarını kapat (Yeni eklendi)
    const io = socketLib.getIO();
    io.close();
    logger.info("📡 Socket.io bağlantıları durduruldu.");

    // 2. DB ve diğer bağlantılar
    await pool.end();
    logger.info("🐘 PostgreSQL bağlantısı kapatıldı.");

    if (redisClient.isOpen) {
      await redisClient.quit();
      logger.info("⚡ Redis bağlantısı kapatıldı.");
    }

    if (rabbitMQ.connection) {
      await rabbitMQ.connection.close();
      logger.info("🐇 RabbitMQ bağlantısı kapatıldı.");
    }

    logger.info("✅ Tüm sistemler başarıyla durduruldu. Çıkış yapılıyor.");
    process.exit(0);
  } catch (error) {
    logger.error("❌ Kapatma sırasında hata oluştu:", error.message);
    process.exit(1);
  }
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
