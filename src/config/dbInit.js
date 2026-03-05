const pool = require("./db");
const fs = require("fs");
const path = require("path");

const initializeDatabase = async () => {
  try {
    console.log("🔄 Veritabanı şeması doğrulanıyor...");
    
    // Projenin ana dizinindeki init.sql dosyasını bul ve oku
    const sqlPath = path.join(__dirname, "../../init.sql");
    const sql = fs.readFileSync(sqlPath, "utf8");

    // Tüm tablo oluşturma komutlarını veritabanına gönder
    await pool.query(sql);
    
    console.log("✅ Tablolar güncel ve sistem hazır.");
  } catch (err) {
    console.error("❌ Veritabanı başlatma hatası:", err);
    // Veritabanı kurulamazsa uygulama çalışmasın (Kritik hata)
    process.exit(1);
  }
};

module.exports = initializeDatabase;