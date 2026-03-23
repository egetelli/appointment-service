const db = require("../config/db"); // Veritabanı bağlantın

exports.getProviderByUserId = async (userId) => {
  const result = await db.query("SELECT id FROM providers WHERE user_id = $1", [
    userId,
  ]);
  return result.rows[0];
};

// --- Mesai Saatleri ---
exports.deleteAllWorkingHours = async (providerId) => {
  await db.query("DELETE FROM working_hours WHERE provider_id = $1", [
    providerId,
  ]);
};

exports.insertWorkingHour = async (providerId, day) => {
  const query = `
        INSERT INTO working_hours (provider_id, day_of_week, start_time, end_time, is_active)
        VALUES ($1, $2, $3, $4, $5)
    `;
  await db.query(query, [
    providerId,
    day.dayIndex,
    day.startTime,
    day.endTime,
    day.isActive,
  ]);
};

// --- Hizmetler ---
exports.upsertService = async (providerId, service) => {
  const query = `
        INSERT INTO services (id, provider_id, name, duration, base_price)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO UPDATE SET 
            name = EXCLUDED.name, 
            duration = EXCLUDED.duration, 
            base_price = EXCLUDED.base_price
    `;
  await db.query(query, [
    service.id,
    providerId,
    service.name,
    service.duration,
    service.base_price,
  ]);
};

exports.deleteService = async (serviceId, providerId) => {
  await db.query("DELETE FROM services WHERE id = $1 AND provider_id = $2", [
    serviceId,
    providerId,
  ]);
};

// 📅 1. Mesai Saatlerini Getir (Bu kısım doğruydu ama garantiye alalım)
exports.getWorkingHours = async (providerId) => {
  const result = await db.query(
    'SELECT day_of_week as "dayIndex", start_time as "startTime", end_time as "endTime", is_active as "isActive" FROM working_hours WHERE provider_id = $1 ORDER BY day_of_week',
    [providerId],
  );
  return result.rows;
};

// ✂️ 2. Hizmetleri Getir (Buradaki JOIN hatayı çözen kısım!)
exports.getServices = async (providerId) => {
  const result = await db.query(
    `SELECT 
        s.id, 
        s.name, 
        s.duration_minutes as "duration", 
        ps.custom_price as "base_price" 
     FROM services s
     JOIN provider_services ps ON s.id = ps.service_id
     WHERE ps.provider_id = $1`,
    [providerId],
  );
  return result.rows;
};

// 👤 3. Profil Bilgilerini Getir (Bio sütunu olmadığı için name ve title yeterli)
exports.getProviderProfile = async (userId) => {
  const result = await db.query(
    "SELECT name, title FROM providers WHERE user_id = $1",
    [userId],
  );
  return result.rows[0];
};

// 📝 4. Profil Bilgilerini Güncelle
exports.updateProviderProfile = async (userId, data) => {
  const query = "UPDATE providers SET name = $1, title = $2 WHERE user_id = $3";
  await db.query(query, [data.name, data.title, userId]);
};
