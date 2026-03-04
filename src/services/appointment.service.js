const pool = require("../config/db");
const ErrorResponse = require("../utils/errorResponse");

/**
 * Müşterinin seçebileceği tüm aktif hizmetleri getirir.
 */
exports.getAvailableServices = async () => {
  const result = await pool.query(
    "SELECT id, name, description, category, price, currency, duration_minutes, buffer_time FROM services WHERE is_active = true ORDER BY name ASC",
  );
  return result.rows;
};

/**
 * Yeni randevu oluşturur (Price Snapshot ve Notes desteği ile)
 */
exports.createSmartAppointment = async (
  userId,
  serviceId,
  slotTime,
  notes = null,
) => {
  // 1. İş kuralı: Geçmiş bir tarihe randevu alınamaz.
  if (new Date(slotTime) < new Date()) {
    throw new ErrorResponse("Geçmiş bir tarihe randevu alamazsınız.", 400);
  }

  // 2. Servis bilgilerini çek (Fiyatı o an dondurmak için)
  const serviceResult = await pool.query(
    "SELECT price FROM services WHERE id = $1 AND is_active = true",
    [serviceId],
  );
  if (serviceResult.rows.length === 0) {
    throw new ErrorResponse(
      "Seçilen hizmet bulunamadı veya artık aktif değil.",
      404,
    );
  }
  const currentPrice = serviceResult.rows[0].price;

  // 3. Çakışma kontrolü
  const conflict = await pool.query(
    "SELECT id FROM appointments WHERE service_id = $1 AND slot_time = $2 AND status != 'cancelled'",
    [serviceId, slotTime],
  );

  if (conflict.rows.length > 0) {
    throw new ErrorResponse("Seçtiğiniz saat dilimi doludur.", 400);
  }

  // 4. Kayıt işlemi (Fiyat ve Notlar eklendi)
  const result = await pool.query(
    `INSERT INTO appointments (user_id, service_id, slot_time, status, total_price, notes) 
         VALUES ($1, $2, $3, 'pending', $4, $5) RETURNING *`,
    [userId, serviceId, slotTime, currentPrice, notes],
  );

  return result.rows[0];
};

/**
 * Kullanıcının randevularını detaylı getirir
 */
exports.getUserAppointments = async (userId) => {
  const result = await pool.query(
    `SELECT a.id, a.slot_time, a.status, a.total_price, a.notes, 
                s.name as service_name, s.duration_minutes 
         FROM appointments a 
         JOIN services s ON a.service_id = s.id 
         WHERE a.user_id = $1 
         ORDER BY a.slot_time DESC`,
    [userId],
  );
  return result.rows;
};
