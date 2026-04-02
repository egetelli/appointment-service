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

  // 3. Yeni Randevuyu Kaydet (GÜNCELLENDİ)
  async createAppointment(appointmentData) {
    // guestName ve status'ü de yakalıyoruz
    const {
      userId,
      providerId,
      serviceId,
      slotTime,
      endTime,
      totalPrice,
      guestName,
      status,
    } = appointmentData;
    const query = `
      INSERT INTO appointments (user_id, provider_id, service_id, slot_time, end_time, total_price, guest_name, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `;
    const { rows } = await pool.query(query, [
      userId,
      providerId,
      serviceId,
      slotTime,
      endTime,
      totalPrice,
      guestName || null,
      status || "booked",
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

  // 5. Kullanıcının randevularını getir (GÜNCELLENDİ)
  async getUserAppointments(userId) {
    const query = `
      SELECT 
        a.id, a.slot_time, a.end_time, a.status, a.total_price,
        s.name as service_name, s.duration_minutes,
        p.name as provider_name,
        u.full_name as customer_name
      FROM appointments a 
      JOIN services s ON a.service_id = s.id 
      JOIN providers p ON a.provider_id = p.id
      JOIN users u ON a.user_id = u.id
      WHERE a.user_id = $1 
        AND a.guest_name IS NULL -- Uzman, müşteri paneline girince kendi aldığı misafirleri görmesin
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

  // 9. Çalışanın randevularını getir (GÜNCELLENDİ)
  async getProviderSchedule(userId, date, startDate, endDate) {
    let query = `
      SELECT 
        a.id, a.slot_time, a.end_time, a.status, a.total_price,
        COALESCE(a.guest_name, u.full_name) as customer_name, -- Misafirse misafir adı, değilse kendi adı
        CASE WHEN a.guest_name IS NOT NULL THEN 'Misafir' ELSE u.email END as customer_email,
        s.name as service_name
      FROM appointments a
      JOIN users u ON a.user_id = u.id
      JOIN services s ON a.service_id = s.id
      JOIN providers p ON a.provider_id = p.id
      WHERE p.user_id = $1
    `;

    const queryParams = [userId];

    if (startDate && endDate) {
      query += ` AND a.slot_time BETWEEN $2 AND $3 ORDER BY a.slot_time ASC`;
      queryParams.push(startDate, endDate);
    } else if (date) {
      query += ` AND DATE(a.slot_time) = $2 ORDER BY a.slot_time ASC`;
      queryParams.push(date);
    } else {
      query += ` ORDER BY a.slot_time DESC LIMIT 50`;
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

  // 18. User ID üzerinden Uzman (Provider) bilgilerini getirir
  async getProviderByUserId(userId) {
    const query = `SELECT * FROM providers WHERE user_id = $1`;
    const { rows } = await pool.query(query, [userId]);

    // Eğer kullanıcı bir uzman değilse undefined döner,
    // uzmansa içindeki 'id' (provider_id) değerini kullanabiliriz.
    return rows[0];
  }

  // 19. Uzmana ait benzersiz müşterileri ve CRM istatistiklerini getir (GÜNCELLENDİ)
  async getProviderClients(providerId) {
    const query = `
      SELECT 
        COALESCE(a.guest_name, u.id::text) as customer_id, -- Çakışma olmasın diye misafirlere özel ID
        COALESCE(a.guest_name, u.full_name) as customer_name,
        CASE WHEN a.guest_name IS NOT NULL THEN 'Misafir' ELSE u.email END as customer_email,
        COUNT(CASE WHEN a.status = 'booked' AND a.slot_time < NOW() THEN 1 END) as completed_visits,
        COUNT(CASE WHEN a.status = 'booked' AND a.slot_time >= NOW() THEN 1 END) as upcoming_visits,
        SUM(CASE WHEN a.status = 'booked' AND a.slot_time < NOW() THEN a.total_price ELSE 0 END) as realized_revenue,
        SUM(CASE WHEN a.status = 'booked' AND a.slot_time >= NOW() THEN a.total_price ELSE 0 END) as expected_revenue,
        MAX(a.slot_time) as last_visit_date
      FROM appointments a
      JOIN users u ON a.user_id = u.id
      WHERE a.provider_id = $1 AND a.status != 'cancelled'
      GROUP BY COALESCE(a.guest_name, u.id::text), COALESCE(a.guest_name, u.full_name), a.guest_name, u.email
      ORDER BY last_visit_date DESC
    `;
    const { rows } = await pool.query(query, [providerId]);
    return rows;
  }

  // 20. Uzmana ait detaylı analitik verileri getir (Özet kartları, ciro grafiği, popüler hizmetler)
  async getProviderAnalytics(providerId) {
    // 1. Özet Kartları: Genel Durum ve Artış Oranları
    const overviewQuery = `
    SELECT 
      COALESCE(SUM(CASE WHEN status = 'booked' AND slot_time < NOW() THEN total_price ELSE 0 END), 0) as realized_revenue,
      COALESCE(SUM(CASE WHEN status = 'booked' AND slot_time >= NOW() THEN total_price ELSE 0 END), 0) as expected_revenue,
      COUNT(CASE WHEN status = 'booked' AND slot_time < NOW() THEN 1 END) as completed_count,
      COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_count,
      COUNT(DISTINCT user_id) as total_customers,
      COALESCE(SUM(CASE WHEN status = 'booked' AND slot_time BETWEEN date_trunc('month', NOW()) AND NOW() THEN total_price ELSE 0 END), 0) as this_month_revenue,
      COALESCE(SUM(CASE WHEN status = 'booked' AND slot_time BETWEEN date_trunc('month', NOW() - INTERVAL '1 month') AND date_trunc('month', NOW()) THEN total_price ELSE 0 END), 0) as last_month_revenue
    FROM appointments
    WHERE provider_id = $1
  `;

    // 2. Günlük Ciro Grafiği (Son 7 Gün - generate_series ile boş günler 0 gelir)
    const dailyQuery = `
    SELECT 
      TO_CHAR(day, 'DD Mon') as date_label,
      COALESCE(SUM(a.total_price), 0) as revenue
    FROM generate_series(
      date_trunc('day', NOW()) - INTERVAL '6 days', 
      date_trunc('day', NOW()), 
      '1 day'::interval
    ) day
    LEFT JOIN appointments a ON date_trunc('day', a.slot_time) = day 
      AND a.provider_id = $1 
      AND a.status = 'booked'
    GROUP BY day
    ORDER BY day ASC
  `;

    // 3. Aylık Ciro Grafiği (Son 6 Ay)
    const monthlyQuery = `
    SELECT 
      TO_CHAR(slot_time, 'Mon') as month,
      SUM(total_price) as revenue,
      EXTRACT(MONTH FROM slot_time) as month_num
    FROM appointments
    WHERE provider_id = $1 
      AND status = 'booked' 
      AND slot_time >= NOW() - INTERVAL '6 months'
      AND slot_time < NOW()
    GROUP BY TO_CHAR(slot_time, 'Mon'), EXTRACT(MONTH FROM slot_time)
    ORDER BY month_num ASC
  `;

    // 4. Popüler Hizmetler
    const servicesQuery = `
    SELECT 
      s.name as service_name,
      COUNT(a.id) as count
    FROM appointments a
    JOIN services s ON a.service_id = s.id
    WHERE a.provider_id = $1 AND a.status = 'booked'
    GROUP BY s.name
    ORDER BY count DESC
    LIMIT 5
  `;

    // Tüm sorguları paralel çalıştır (Performans 🚀)
    const [overviewRes, dailyRes, monthlyRes, servicesRes] = await Promise.all([
      pool.query(overviewQuery, [providerId]),
      pool.query(dailyQuery, [providerId]),
      pool.query(monthlyQuery, [providerId]),
      pool.query(servicesQuery, [providerId]),
    ]);

    // Artış Yüzdesini Hesapla
    const overviewData = overviewRes.rows[0];
    const thisMonth = Number(overviewData.this_month_revenue);
    const lastMonth = Number(overviewData.last_month_revenue);

    let revenue_growth = 0;
    if (lastMonth > 0) {
      revenue_growth = ((thisMonth - lastMonth) / lastMonth) * 100;
    } else if (thisMonth > 0) {
      revenue_growth = 100;
    }

    return {
      overview: {
        ...overviewData,
        revenue_growth: revenue_growth.toFixed(1),
      },
      daily: dailyRes.rows, // Frontend'e yeni ekledik!
      monthly: monthlyRes.rows,
      services: servicesRes.rows,
    };
  }

  // 21. İsim veya E-postaya göre SADECE müşterileri ara
  async searchCustomers(searchTerm) {
    const query = `
      SELECT id, full_name, email 
      FROM users 
      WHERE role = 'customer' 
        AND (full_name ILIKE $1 OR email ILIKE $1)
      LIMIT 10;
    `;
    // % işareti ile içinde geçenleri arıyoruz
    const { rows } = await pool.query(query, [`%${searchTerm}%`]);
    return rows;
  }
}

module.exports = new AppointmentRepository();
