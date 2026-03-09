require("dotenv").config();
const app = require("./app");
const pool = require("./config/db");
const dbInit = require("./config/dbInit");

const rabbitMQ = require("./config/rabbitmq");
const redisClient = require("./config/redis");

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    // 1. Önce fiziksel bağlantıyı (PostgreSQL) kontrol et
    await pool.query("SELECT NOW()");
    console.log("🐘 [PostgreSQL] Veritabanı bağlantısı başarılı.");

    // 2. Tabloları kontrol et ve yoksa oluştur (Auto-Migration)
    await dbInit();

    // 3. Redis Bağlantısını Kontrol Et (Ping atarak ayakta mı diye soruyoruz)
    // Eğer redis.js içinde zaten connect() olduysa ping atarız, olmadıysa burada bağlarız.
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
    await redisClient.ping();
    console.log("⚡ [REDIS] Önbellek bağlantısı başarılı.");

    // 4. RabbitMQ Bağlantısını Başlat (Kuyruk Sistemini Uyandır 🐇)
    await rabbitMQ.connect();

    // 5. Her şey (DB, Tablolar, Redis, Kuyruk) hazır olduktan sonra sunucuyu başlat
    const server = app.listen(PORT, () => {
      console.log(`🚀 [API] Sunucu port ${PORT} üzerinde çalışıyor...`);
      console.log(`🌍 [Ortam] ${process.env.NODE_ENV || "development"}`);
    });

    require("./jobs/reminder.job");

    return server;
  } catch (err) {
    console.error("❌ Başlatma hatası:", err.message);
    process.exit(1);
  }
};

let server;

startServer().then((s) => {
  server = s;
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Rejection:", err.message);
  if (server && server.listening) {
    // server nesnesi var mı ve dinliyor mu kontrolü
    server.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("💥 Uncaught Exception:", err.message);
  process.exit(1);
});

// Graceful shutdown
const shutdown = async () => {
  console.log("\n👋 Sunucu zarif bir şekilde kapatılıyor...");
  try {
    // 1. Veritabanı havuzunu kapat
    await pool.end();
    console.log("🐘 PostgreSQL bağlantısı kapatıldı.");

    // 2. Redis bağlantısını güvenle kapat
    if (redisClient.isOpen) {
      await redisClient.quit();
      console.log("⚡ Redis bağlantısı kapatıldı.");
    }

    // 3. RabbitMQ bağlantısını güvenle kapat
    if (rabbitMQ.connection) {
      await rabbitMQ.connection.close();
      console.log("🐇 RabbitMQ bağlantısı kapatıldı.");
    }

    console.log("✅ Tüm sistemler başarıyla durduruldu. Çıkış yapılıyor.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Kapatma sırasında hata oluştu:", error.message);
    process.exit(1);
  }
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
