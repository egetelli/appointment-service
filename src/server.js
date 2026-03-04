require("dotenv").config();
const app = require("./app");
const pool = require("./config/db");

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await pool.query("SELECT NOW()");
    console.log("✅ Veritabanı bağlantısı başarılı.");

    const server = app.listen(PORT, () => {
      console.log(`🚀 Sunucu port ${PORT} üzerinde çalışıyor...`);
      console.log(`🌍 Ortam: ${process.env.NODE_ENV || "development"}`);
    });

    return server;
  } catch (err) {
    console.error("❌ Veritabanı başlatılamadı:", err.message);
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
  if (server && server.listening) { // server nesnesi var mı ve dinliyor mu kontrolü
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
  console.log("👋 Sunucu kapatılıyor...");
  await pool.end();
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
