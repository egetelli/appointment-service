const pool = require("../config/db");

class AppointmentRepository {
  // 1. Çalışan bu hizmeti veriyor mu?
  async getProviderServiceDetails(providerId, serviceId) {
    const query = `
      SELECT 
        s.name, 
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
        p.name as provider_name,
        u.full_name as customer_name -- 👈 İŞTE BURAYI EKLEDİK
      FROM appointments a 
      JOIN services s ON a.service_id = s.id 
      JOIN providers p ON a.provider_id = p.id
      JOIN users u ON a.user_id = u.id -- 👈 VE BU JOIN'İ EKLEDİK
      WHERE a.user_id = $1 
      ORDER BY a.slot_time DESC
    `;
    const { rows } = await pool.query(query, [userId]);
    return rows;
  }

  // 6. Çalışanın belirli bir gündeki mesai saatini getir
  async getWorkingHours(providerId, dayOfWeek) {
    const query = `
    SELECT start_time, end_time 
    FROM working_hours 
    WHERE provider_id = $1 AND day_of_week = $2
  `;
    const { rows } = await pool.query(query, [providerId, dayOfWeek]);
    return rows[0];
  }

  // 7. Belirli bir tarihteki tüm dolu randevuları getir
  async getBookedAppointments(providerId, date) {
    const query = `
    SELECT slot_time, end_time 
    FROM appointments 
    WHERE provider_id = $1 
      AND status != 'cancelled'
      AND DATE(slot_time) = $2
  `;
    const { rows } = await pool.query(query, [providerId, date]);
    return rows;
  }

  // 8. Randevuyu İptal Et (Sadece ilgili kullanıcıya ait olanı iptal etmeli)
  async cancelAppointment(appointmentId, userId) {
    const query = `
      UPDATE appointments a
      SET status = 'cancelled'
      FROM services s -- 👈 Hizmet bilgilerini almak için JOIN yapıyoruz
      WHERE a.id = $1 
        AND a.user_id = $2 
        AND a.service_id = s.id -- 👈 Randevudaki service_id ile services tablosunu eşliyoruz
      RETURNING a.*, s.name as service_name; -- 👈 Randevu bilgilerinin yanına hizmet adını ekleyip dönüyoruz
    `;
    const { rows } = await pool.query(query, [appointmentId, userId]);
    return rows[0];
  }

  // 9. Çalışanın randevularını getir (Tarih verilirse o gün, verilmezse bugünden sonraki yaklaşanlar)
  async getProviderSchedule(userId, date) {
    let query = `
      SELECT 
        a.id, a.slot_time, a.end_time, a.status, a.total_price,
        u.full_name as customer_name, u.email as customer_email,
        s.name as service_name
      FROM appointments a
      JOIN users u ON a.user_id = u.id
      JOIN services s ON a.service_id = s.id
      JOIN providers p ON a.provider_id = p.id
      WHERE p.user_id = $1
    `;

    const queryParams = [userId];

    if (date) {
      // 1. Senaryo: Belirli bir tarih istenmiş (Örn: Takvim sayfasından veya Bugünün Özeti için)
      query += ` AND DATE(a.slot_time) = $2 ORDER BY a.slot_time ASC`;
      queryParams.push(date);
    } else {
      // 2. Senaryo: Tarih yok! (Dashboard tablosu için)
      // Sadece şu andan itibaren olan "Yaklaşan" randevuları getir, onay bekleyenleri (pending) en üste koy.
      query += ` AND a.slot_time >= NOW() 
                 ORDER BY 
                    CASE WHEN a.status = 'pending' THEN 1 ELSE 2 END, 
                    a.slot_time ASC 
                 LIMIT 15`; // Sadece en yakın 15 randevuyu göster
    }

    const { rows } = await pool.query(query, queryParams);
    return rows;
  }

  // 10. Randevuyu ID'sine göre getir (Detaylı bilgi için)
  async getAppointmentById(id) {
    const query = "SELECT * FROM appointments WHERE id = $1";
    const { rows } = await pool.query(query, [id]);
    return rows[0];
  }

  // 11. Genel İstatistikler: Hizmet popülerliği ve gelir
  async getProviderStats(providerId) {
    const query = `
    SELECT 
      s.name as service_name,
      COUNT(a.id) as total_appointments,
      SUM(CASE WHEN a.status = 'booked' THEN a.total_price ELSE 0 END) as total_revenue,
      COUNT(CASE WHEN a.status = 'cancelled' THEN 1 END) as cancelled_count
    FROM services s
    JOIN appointments a ON s.id = a.service_id
    JOIN providers p ON a.provider_id = p.id
    WHERE p.user_id = $1
    GROUP BY s.name
    ORDER BY total_appointments DESC
  `;
    const { rows } = await pool.query(query, [providerId]);
    return rows;
  }

  // 12. Sistem Geneli Özet (Admin veya Genel Bakış için)
  async getSystemSummary() {
    const query = `
    SELECT 
      status, 
      COUNT(*) as count, 
      SUM(total_price) as total_value
    FROM appointments
    GROUP BY status
  `;
    const { rows } = await pool.query(query);
    return rows;
  }

  // 13. Çalışanın user_id'sini verip, provider tablosundaki id'sini buluruz
  async getProviderIdByUserId(userId) {
    const query = "SELECT id FROM providers WHERE user_id = $1";
    const { rows } = await pool.query(query, [userId]);
    return rows[0]; // { id: 'uuid-değeri' } döner
  }

  // 14. Randevu saatinin, çalışanın mesai saatleri içinde olup olmadığını kontrol eder
  async isWithinWorkingHours(providerId, requestedStartTime, requestedEndTime) {
    const query = `
      SELECT 1 
      FROM working_hours 
      WHERE provider_id = $1 
        AND day_of_week = EXTRACT(ISODOW FROM $2::text::timestamptz) 
        AND start_time <= ($2::text::timestamptz)::time 
        AND end_time >= ($3::text::timestamptz)::time
    `;

    const { rows } = await pool.query(query, [
      providerId,
      requestedStartTime,
      requestedEndTime,
    ]);

    return rows.length > 0;
  }

  // 15. Randevu statüsünü güncelle (Onaylama için)
  async updateAppointmentStatus(appointmentId, status) {
    const query = `
    UPDATE appointments 
    SET status = $2, updated_at = NOW() 
    WHERE id = $1 
    RETURNING *
  `;

    const { rows } = await pool.query(query, [appointmentId, status]);

    return rows[0];
  }

  // 16. Çalışanın user_id'sini verip, provider tablosundaki id'sini buluruz
  async getProviderUserByProviderId(providerId) {
    const query = `SELECT user_id FROM providers WHERE id = $1`;
    const { rows } = await pool.query(query, [providerId]);
    return rows[0]; // Bu, uzmanın ana "user_id"sini döndürür
  }

  // 17. Randevuyu ID'sine göre detaylı bilgiyle getir (Hizmet adı, müşteri adı vs. ile)
  async getAppointmentDetailsById(appointmentId) {
    const query = `
      SELECT 
        a.*, -- Tüm randevu bilgileri
        s.name as service_name, s.duration_minutes,
        p.name as provider_name,
        u.full_name as customer_name
      FROM appointments a 
      JOIN services s ON a.service_id = s.id 
      JOIN providers p ON a.provider_id = p.id
      JOIN users u ON a.user_id = u.id
      WHERE a.id = $1
    `;
    const { rows } = await pool.query(query, [appointmentId]);
    return rows[0];
  }
}

module.exports = new AppointmentRepository();
