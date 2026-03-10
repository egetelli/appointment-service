const pool = require("./db");
const fs = require("fs");
const path = require("path");
const logger = require('../utils/logger');

const initializeDatabase = async () => {
  try {
    logger.info("🔄 Veritabanı şeması doğrulanıyor...");
    
    // Projenin ana dizinindeki init.sql dosyasını bul ve oku
    const sqlPath = path.join(__dirname, "../../init.sql");
    const sql = fs.readFileSync(sqlPath, "utf8");

    // Tüm tablo oluşturma komutlarını veritabanına gönder
    await pool.query(sql);
    
    logger.info("✅ Tablolar güncel ve sistem hazır.");
  } catch (err) {
    logger.error("❌ Veritabanı başlatma hatası:", err);
    // Veritabanı kurulamazsa uygulama çalışmasın (Kritik hata)
    process.exit(1);
  }
};

module.exports = initializeDatabase;