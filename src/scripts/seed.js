const { Pool } = require("pg");
const bcrypt = require("bcrypt");
require("dotenv").config();


//***********************************************
// Çalıştırmak için terminalde:
// node src/config/seed.js komutunu kullanabilirsin. Bu, veritabanını temizleyip yeni örnek verilerle dolduracak.
//***********************************************

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://admin:admin@localhost:5432/appointment_db",
});

async function seed() {
  const client = await pool.connect();
  try {
    console.log("🌱 Veritabanı tüm tablolar için tohumlanıyor...");

    // 1. Mevcut tüm verileri temizle (Sıralama FK ilişkileri nedeniyle önemlidir)
    await client.query(`
      TRUNCATE 
        appointments, 
        availabilities, 
        working_hours, 
        provider_services, 
        providers, 
        services, 
        users 
      RESTART IDENTITY CASCADE
    `);

    const hashedPw = await bcrypt.hash("123456", 10);

    // 2. USERS: Admin, Provider ve Customer oluştur
    const userRes = await client.query(`
      INSERT INTO users (full_name, email, password_hash, role) VALUES
      ('Sistem Yöneticisi', 'admin@randevupro.com', '${hashedPw}', 'admin'),
      ('Uzman Doktor Ahmet', 'ahmet@randevupro.com', '${hashedPw}', 'provider'),
      ('Ege Test', 'ege.test@gmail.com', '${hashedPw}', 'customer')
      RETURNING id, role, email
    `);

    const providerUser = userRes.rows.find(
      (u) => u.email === "ahmet@randevupro.com",
    );
    const customerUser = userRes.rows.find(
      (u) => u.email === "ege.test@gmail.com",
    );

    // 3. PROVIDERS: User tablosundaki kullanıcıyı provider olarak tanımla
    const providerRes = await client.query(`
      INSERT INTO providers (user_id, bio, experience_years) VALUES
      (${providerUser.id}, '15 yıllık deneyime sahip genel cerrah.', 15)
      RETURNING id
    `);
    const providerId = providerRes.rows[0].id;

    // 4. SERVICES: Sunulan hizmetleri ekle
    const serviceRes = await client.query(`
      INSERT INTO services (name, description, duration, price) VALUES
      ('Genel Muayene', 'Standart sağlık kontrolü', 30, 300),
      ('Detaylı Analiz', 'Kapsamlı laboratuvar incelemesi', 60, 750),
      ('Kısa Konsültasyon', 'Hızlı sonuç değerlendirme', 15, 150)
      RETURNING id
    `);
    const services = serviceRes.rows;

    // 5. PROVIDER_SERVICES: Çalışanı hizmetlerle eşleştir (M:N İlişkisi)
    for (const service of services) {
      await client.query(`
        INSERT INTO provider_services (provider_id, service_id) VALUES
        (${providerId}, ${service.id})
      `);
    }

    // 6. WORKING_HOURS: Çalışanın haftalık mesai saatlerini tanımla (Pzt-Cuma)
    const days = [1, 2, 3, 4, 5]; // Pazartesi = 1
    for (const day of days) {
      await client.query(`
        INSERT INTO working_hours (provider_id, day_of_week, start_time, end_time) VALUES
        (${providerId}, ${day}, '09:00:00', '17:00:00')
      `);
    }

    // 7. AVAILABILITIES: Özel müsaitlik durumu (Örn: Gelecek hafta için bir gün)
    await client.query(`
      INSERT INTO availabilities (provider_id, date, is_available) VALUES
      (${providerId}, CURRENT_DATE + INTERVAL '1 day', true)
    `);

    // 8. APPOINTMENTS: Test için bir adet geçmiş/gelecek randevu ekle
    await client.query(`
      INSERT INTO appointments (user_id, provider_id, service_id, slot_time, status, total_price) VALUES
      (${customerUser.id}, ${providerId}, ${services[0].id}, (CURRENT_DATE + INTERVAL '2 days' + INTERVAL '10 hours'), 'booked', 300)
    `);

    console.log("✅ Tüm tablolar başarıyla dolduruldu!");
    console.log("----------------------------------");
    console.log("Kurulan İlişkiler:");
    console.log("- Provider ve User bağlandı.");
    console.log("- Provider ve Services eşleşti.");
    console.log("- Haftalık mesai ve örnek randevu eklendi.");
  } catch (err) {
    console.error("❌ Seed hatası:", err);
  } finally {
    client.release();
    process.exit();
  }
}

seed();


