const db = require("../config/db"); // Kendi DB bağlantı dosyan

class AdminRepository {
  async getDashboardStats() {
    // Toplam Kullanıcılar (Örnek SQL sorguları)
    const totalUsersQuery = await db.query(
      "SELECT COUNT(*) as count FROM users",
    );
    const totalProvidersQuery = await db.query(
      "SELECT COUNT(*) as count FROM users WHERE role = $1",
      ["provider"],
    );
    const totalClientsQuery = await db.query(
      "SELECT COUNT(*) as count FROM users WHERE role = $1",
      ["customer"],
    );

    // Bu Haftanın Randevuları
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const weeklyAppointmentsQuery = await db.query(
      "SELECT COUNT(*) as count FROM appointments WHERE slot_time >= $1",
      [startOfWeek],
    );

    // Toplam Gerçekleşen Ciro
    const totalRevenueQuery = await db.query(
      "SELECT COALESCE(SUM(total_price), 0) as total FROM appointments WHERE status = 'booked' AND slot_time < NOW()",
    );

    return {
      total_users: parseInt(totalUsersQuery.rows[0].count),
      total_providers: parseInt(totalProvidersQuery.rows[0].count),
      total_clients: parseInt(totalClientsQuery.rows[0].count),
      weekly_appointments: parseInt(weeklyAppointmentsQuery.rows[0].count),
      total_revenue: parseFloat(totalRevenueQuery.rows[0].total),
      growth: 14, // Dinamik hesaplanabilir
      system_health: "Sağlıklı",
    };
  }

  // GRAFİKLER İÇİN EKLENEN YENİ FONKSİYON
  async getWeeklyAppointmentsList() {
    // Haftanın başlangıcını bul (Diğer fonksiyonla aynı mantık)
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0); // O günün gece yarısından itibaren al

    // Sadece randevu tarihlerini ve durumlarını çeker (Grafik çizimi için)
    const query = await db.query(
      "SELECT slot_time, status FROM appointments WHERE slot_time >= $1 AND type = 'appointment'",
      [startOfWeek],
    );

    return query.rows;
  }

  // --- USER CRUD ---
  async getAllUsers() {
    const query = await db.query(`
    SELECT 
      u.id, 
      u.full_name, 
      u.email, 
      u.role, 
      u.created_at,
      p.title -- Providers tablosundaki ünvanı alıyoruz
    FROM users u
    LEFT JOIN providers p ON u.id = p.user_id -- User ID üzerinden tabloları bağlıyoruz
    ORDER BY u.created_at DESC
  `);
    return query.rows;
  }

  async createUser(data) {
    // Frontend'den artık 'title' da gelecek
    const { full_name, email, password, role, title } = data;

    // 1. Önce users tablosuna kişiyi ekle
    const query = await db.query(
      "INSERT INTO users (full_name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, full_name, email, role",
      [full_name, email, password, role],
    );
    const newUser = query.rows[0];

    // 2. EĞER ROL "PROVIDER" İSE, ANINDA UZMAN PROFİLİNİ DE OLUŞTUR!
    if (role === "provider") {
      await db.query(
        "INSERT INTO providers (user_id, name, title) VALUES ($1, $2, $3)",
        [newUser.id, newUser.full_name, title || "Uzman"], // Title girilmemişse 'Uzman' yaz
      );
    }

    return newUser;
  }

  async updateUser(id, data) {
    const { full_name, email, role } = data;
    const query = await db.query(
      "UPDATE users SET full_name = $1, email = $2, role = $3 WHERE id = $4 RETURNING *",
      [full_name, email, role, id],
    );
    return query.rows[0];
  }

  async deleteUser(id) {
    await db.query("DELETE FROM users WHERE id = $1", [id]);
    return true;
  }

  // --- PROVIDER & SERVICE CRUD ---
  // UZMANIN HİZMETLERİNİ GETİR
  async getProviderServices(providerUserId) {
    const query = await db.query(
      `
      SELECT 
        s.id as id,
        s.name, 
        s.description, 
        s.duration_minutes, 
        COALESCE(ps.custom_price, s.base_price) as base_price 
      FROM provider_services ps
      JOIN providers p ON p.id = ps.provider_id
      JOIN services s ON s.id = ps.service_id
      WHERE p.user_id = $1
    `,
      [providerUserId],
    );

    return query.rows;
  }

  // YENİ SERVİS EKLEME (DÜZELTİLDİ)
  async createService(providerUserId, data) {
    const { name, description, duration_minutes, base_price } = data;

    // 1. Uzmanın gerçek Provider ID'sini bul
    const providerCheck = await db.query(
      "SELECT id FROM providers WHERE user_id = $1",
      [providerUserId],
    );
    if (providerCheck.rows.length === 0) throw new Error("Uzman bulunamadı");
    const realProviderId = providerCheck.rows[0].id;

    // 2. Servisi genel havuza (services tablosuna) ekle.
    // DİKKAT: Artık provider_id eklemiyoruz çünkü bu sütun yok!
    const newService = await db.query(
      "INSERT INTO services (name, description, duration_minutes, base_price) VALUES ($1, $2, $3, $4) RETURNING *",
      [name, description, duration_minutes, base_price],
    );
    const serviceId = newService.rows[0].id;

    // 3. Uzman ile bu servisi köprü tablo (provider_services) üzerinden birbirine bağla
    await db.query(
      "INSERT INTO provider_services (provider_id, service_id, custom_price) VALUES ($1, $2, $3)",
      [realProviderId, serviceId, base_price],
    );

    return newService.rows[0];
  }

  // MEVCUT SERVİSİ GÜNCELLEME
  async updateService(serviceId, data) {
    const { name, description, duration_minutes, base_price } = data;

    // 1. Services tablosunu güncelle
    const query = await db.query(
      "UPDATE services SET name = $1, description = $2, duration_minutes = $3, base_price = $4 WHERE id = $5 RETURNING *",
      [name, description, duration_minutes, base_price, serviceId],
    );

    // 2. Köprü tablodaki (provider_services) özel fiyatı da güncelle
    await db.query(
      "UPDATE provider_services SET custom_price = $1 WHERE service_id = $2",
      [base_price, serviceId],
    );

    return query.rows[0];
  }

  // MEVCUT SERVİSİ SİLME
  async deleteService(serviceId) {
    // Önce köprü tablodan bağını kopar
    await db.query("DELETE FROM provider_services WHERE service_id = $1", [
      serviceId,
    ]);
    // Sonra ana tablodan sil
    await db.query("DELETE FROM services WHERE id = $1", [serviceId]);
    return true;
  }

  // ========================================================
  // ÇALIŞMA SAATLERİ (WORKING HOURS)
  // ========================================================
  async getWorkingHours(providerUserId) {
    const query = await db.query(
      `
      SELECT wh.* FROM working_hours wh
      JOIN providers p ON wh.provider_id = p.id
      WHERE p.user_id = $1 
      ORDER BY wh.day_of_week
    `,
      [providerUserId],
    );

    return query.rows;
  }

  async updateWorkingHours(providerUserId, hoursArray) {
    const providerCheck = await db.query(
      "SELECT id FROM providers WHERE user_id = $1",
      [providerUserId],
    );
    if (providerCheck.rows.length === 0) return false;
    const realProviderId = providerCheck.rows[0].id;

    await db.query("DELETE FROM working_hours WHERE provider_id = $1", [
      realProviderId,
    ]);

    for (const h of hoursArray) {
      await db.query(
        "INSERT INTO working_hours (provider_id, day_of_week, start_time, end_time, is_active) VALUES ($1, $2, $3, $4, $5)",
        [realProviderId, h.day_of_week, h.start_time, h.end_time, h.is_active],
      );
    }
    return true;
  }

  async getAppointments(providerId) {
    let queryText = `
      SELECT 
        a.id, 
        a.slot_time, 
        a.status, 
        a.total_price,
        COALESCE(u.full_name, a.guest_name, 'Bilinmeyen Müşteri') AS customer_name,
        p.name AS provider_name,
        s.name AS service_name
      FROM appointments a
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN providers p ON a.provider_id = p.id
      LEFT JOIN services s ON a.service_id = s.id
    `;

    const params = [];

    // Eğer admin bir uzman seçtiyse, sadece o uzmanınkileri getir
    if (providerId) {
      queryText += ` WHERE a.provider_id = $1`;
      params.push(providerId);
    }

    // Randevuları tarihe göre yeniden eskiye sırala
    queryText += ` ORDER BY a.slot_time DESC`;

    const result = await db.query(queryText, params);
    return result.rows;
  }
}

module.exports = new AdminRepository();
