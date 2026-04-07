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
}

module.exports = new AdminRepository();
