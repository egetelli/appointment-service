const pool = require("../config/db");

class AppointmentRepository {
  // 1. Çalışan bu hizmeti veriyor mu?
  async getProviderServiceDetails(providerId, serviceId) {
    const query = `
      SELECT 
        s.duration_minutes, 
        COALESCE(ps.custom_price, s.base_price) as final_price
      FROM provider_services ps
      JOIN services s ON ps.service_id = s.id
      WHERE ps.provider_id = $1 AND ps.service_id = $2
    `;
    const { rows } = await pool.query(query, [providerId, serviceId]);
    return rows[0];
  }

  // 2. Çakışma Kontrolü
  async checkOverlap(providerId, requestedStartTime, requestedEndTime) {
    const query = `
      SELECT id FROM appointments
      WHERE provider_id = $1
        AND status != 'cancelled'
        AND (slot_time < $3 AND end_time > $2)
    `;
    const { rows } = await pool.query(query, [
      providerId,
      requestedStartTime,
      requestedEndTime,
    ]);
    return rows.length > 0;
  }

  // 3. Yeni Randevuyu Kaydet
  async createAppointment(appointmentData) {
    const { userId, providerId, serviceId, slotTime, endTime, totalPrice } =
      appointmentData;
    const query = `
      INSERT INTO appointments (user_id, provider_id, service_id, slot_time, end_time, total_price)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const { rows } = await pool.query(query, [
      userId,
      providerId,
      serviceId,
      slotTime,
      endTime,
      totalPrice,
    ]);
    return rows[0];
  }

  // 👇 YENİ EKLENENLER 👇

  // 4. Tüm aktif hizmetleri getir (Yeni tabloya göre)
  async getAvailableServices() {
    const query =
      "SELECT id, name, description, duration_minutes, base_price FROM services ORDER BY name ASC";
    const { rows } = await pool.query(query);
    return rows;
  }

  // 5. Kullanıcının randevularını getir (Çalışan/Provider bilgisiyle beraber)
  async getUserAppointments(userId) {
    const query = `
      SELECT 
        a.id, a.slot_time, a.end_time, a.status, a.total_price,
        s.name as service_name, s.duration_minutes,
        p.name as provider_name
      FROM appointments a 
      JOIN services s ON a.service_id = s.id 
      JOIN providers p ON a.provider_id = p.id
      WHERE a.user_id = $1 
      ORDER BY a.slot_time DESC
    `;
    const { rows } = await pool.query(query, [userId]);
    return rows;
  }
}

module.exports = new AppointmentRepository();
