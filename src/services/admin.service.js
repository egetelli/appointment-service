const adminRepository = require("../repositories/admin.repository");

class AdminService {
  async getDashboardSummary() {
    // 1. Üstteki KPI İstatistiklerini DB'den çek
    const stats = await adminRepository.getDashboardStats();

    // 2. HAFTALIK TRAFİK GRAFİĞİ İÇİN GERÇEK VERİ HESAPLAMA
    // Repository'ye eklediğimiz fonksiyonu çağırıyoruz (Son 7 günün listesi)
    const weeklyAppointments =
      await adminRepository.getWeeklyAppointmentsList();

    // Haftanın 7 günü için başlangıçta 0'lardan oluşan diziler (Pzt, Sal, Çar, Per, Cum, Cmt, Paz)
    const realizedData = [0, 0, 0, 0, 0, 0, 0];
    const cancelledData = [0, 0, 0, 0, 0, 0, 0];

    // Randevuları veritabanındaki tarihlerine göre günlere dağıt
    if (weeklyAppointments && weeklyAppointments.length > 0) {
      weeklyAppointments.forEach((app) => {
        const date = new Date(app.slot_time);

        // JavaScript'te getDay() Pazar için 0, Pazartesi için 1 döner.
        // Bizim grafiğimiz Pazartesi(0)'den başlıyor, bu yüzden indexi ayarlıyoruz:
        let dayIndex = date.getDay() - 1;
        if (dayIndex === -1) dayIndex = 6; // Pazar gününü sona (6. index) at

        if (app.status === "booked" || app.status === "completed") {
          realizedData[dayIndex]++;
        } else if (app.status === "cancelled") {
          cancelledData[dayIndex]++;
        }
      });
    }

    const trafficChart = {
      series: [
        { name: "Gerçekleşen", data: realizedData },
        { name: "İptaller", data: cancelledData },
      ],
    };

    // 3. ROL DAĞILIMI GRAFİĞİ (Sistemdeki güncel sayılara göre)
    const roleChart = {
      series: [stats.total_providers, stats.total_clients],
      labels: ["Uzmanlar", "Müşteriler"],
    };

    // 4. Frontend'in beklediği tam objeyi dönüştür
    return {
      stats,
      trafficChart,
      roleChart,
    };
  }

  async getUsers() {
    return await adminRepository.getAllUsers();
  }

  async createUser(userData) {
    // Şifreyi hash'liyoruz (default şifre belirleyebilirsin)
    const hashedPassword = await bcrypt.hash(
      userData.password || "Slotra123!",
      10,
    );
    return await adminRepository.createUser({
      ...userData,
      password: hashedPassword,
    });
  }

  async updateUser(id, data) {
    return await adminRepository.updateUser(id, data);
  }

  async deleteUser(id) {
    return await adminRepository.deleteUser(id);
  }

  async updateProviderProfile(id, data) {
    return await adminRepository.updateProviderProfile(id, data);
  }

  async getProviderServices(providerId) {
    return await adminRepository.getProviderServices(providerId);
  }

  async manageService(serviceId, data, providerId) {
    if (serviceId) {
      return await adminRepository.updateService(serviceId, data);
    }
    return await adminRepository.createService(providerId, data);
  }

  async deleteService(serviceId) {
    return await adminRepository.deleteService(serviceId);
  }

  async getWorkingHours(providerId) {
    return await adminRepository.getWorkingHours(providerId);
  }

  async updateWorkingHours(providerId, hours) {
    return await adminRepository.updateWorkingHours(providerId, hours);
  }

  async getAppointments(providerId) {
    return await adminRepository.getAppointments(providerId);
  }
}

module.exports = new AdminService();
