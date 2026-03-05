const appointmentRepo = require("../repositories/appointment.repository");
const ErrorResponse = require("../utils/errorResponse");

/**
 * Müşterinin seçebileceği tüm aktif hizmetleri getirir.
 */
exports.getAvailableServices = async () => {
  return await appointmentRepo.getAvailableServices();
};

/**
 * Yeni randevu oluşturur (Çakışma ve Fiyat/Süre kontrolleri ile)
 */
exports.createSmartAppointment = async (
  userId,
  providerId,
  serviceId,
  slotTime,
) => {
  const requestedStartTime = new Date(slotTime);

  // 1. Kural: Geçmişe randevu alınamaz
  if (requestedStartTime < new Date()) {
    throw new ErrorResponse("Geçmiş bir tarihe randevu alamazsınız.", 400);
  }

  // 2. Kural: Bu çalışan (provider) bu hizmeti veriyor mu?
  const serviceDetails = await appointmentRepo.getProviderServiceDetails(
    providerId,
    serviceId,
  );

  if (!serviceDetails) {
    throw new ErrorResponse(
      "Seçilen çalışan bu hizmeti vermiyor veya hizmet bulunamadı.",
      404,
    );
  }

  // 3. Süre Hesaplama: Başlangıç saatine, hizmetin süresini ekleyerek bitiş saatini bul
  const durationMs = serviceDetails.duration_minutes * 60000;
  const requestedEndTime = new Date(requestedStartTime.getTime() + durationMs);

  // 4. Çakışma Kontrolü: Çalışanın bu saatler arasında başka müşterisi var mı?
  const isOverlap = await appointmentRepo.checkOverlap(
    providerId,
    requestedStartTime,
    requestedEndTime,
  );

  if (isOverlap) {
    throw new ErrorResponse(
      "Seçilen çalışanın bu saatler arası doludur. Lütfen başka bir saat seçin.",
      400,
    );
  }

  // 5. Kayıt İşlemi
  const appointmentData = {
    userId,
    providerId,
    serviceId,
    slotTime: requestedStartTime,
    endTime: requestedEndTime,
    totalPrice: serviceDetails.final_price,
  };

  return await appointmentRepo.createAppointment(appointmentData);
};

/**
 * Kullanıcının randevularını detaylı getirir
 */
exports.getUserAppointments = async (userId) => {
  return await appointmentRepo.getUserAppointments(userId);
};

/**
 * Belirli bir çalışan, hizmet ve tarih için müsait randevu saatlerini hesaplar.
 */
exports.getAvailableSlots = async (providerId, serviceId, date) => {
  // 1. Hizmet bilgilerini al (Süre ve fiyat için)
  const service = await appointmentRepo.getProviderServiceDetails(
    providerId,
    serviceId,
  );
  if (!service) {
    throw new ErrorResponse("Hizmet veya çalışana ait yetki bulunamadı.", 404);
  }

  // 2. İstenen tarihin haftanın hangi günü olduğunu bul (0: Pazar, 6: Cumartesi)
  const dayOfWeek = new Date(date).getDay();

  // 3. Mesai saatlerini ve o günkü dolu randevuları paralel olarak çek
  const [workingHours, bookedAppointments] = await Promise.all([
    appointmentRepo.getWorkingHours(providerId, dayOfWeek),
    appointmentRepo.getBookedAppointments(providerId, date),
  ]);

  // Eğer o gün için mesai saati tanımı yoksa (tatilse), boş liste dön
  if (!workingHours) {
    return [];
  }

  const slots = [];
  const duration = service.duration_minutes;

  // 4. Günün başlangıç ve bitiş zamanlarını Date objesine çevir
  let currentSlot = new Date(`${date}T${workingHours.start_time}`);
  const workEnd = new Date(`${date}T${workingHours.end_time}`);

  // 5. Mesai bitene kadar döngü ile slotları üret
  while (currentSlot < workEnd) {
    // Mevcut slotun bitiş saatini hesapla (başlangıç + hizmet süresi)
    const slotEnd = new Date(currentSlot.getTime() + duration * 60000);

    // Eğer bu slot mesai bitişini aşıyorsa döngüyü kır (örn: 17:45'te başlayan 30dk'lık iş)
    if (slotEnd > workEnd) break;

    // 6. Çakışma Kontrolü: Bu slot dolu randevularla kesişiyor mu?
    const isBooked = bookedAppointments.some((booked) => {
      const bStart = new Date(booked.slot_time);
      const bEnd = new Date(booked.end_time);
      return currentSlot < bEnd && slotEnd > bStart; // Overlap mantığı
    });

    // Slotu listeye ekle
    slots.push({
      time: currentSlot.toISOString(),
      isAvailable: !isBooked,
    });

    // Bir sonraki slotun başlangıcını ayarla (hizmet süresi kadar ileri sar)
    currentSlot = new Date(currentSlot.getTime() + duration * 60000);
  }

  return slots;
};

/**
 * Kullanıcının kendi randevusunu iptal eder.
 */
exports.cancelAppointment = async (appointmentId, userId) => {
  // 1. Randevuyu önce veritabanından bulalım (Saatini kontrol etmek için)
  const appointment = await appointmentRepo.getAppointmentById(appointmentId);

  if (!appointment) {
    throw new ErrorResponse("Randevu bulunamadı.", 404);
  }

  // 2. Güvenlik Kontrolü: Bu randevu gerçekten bu kullanıcıya mı ait?
  if (appointment.user_id !== userId) {
    throw new ErrorResponse("Bu randevuyu iptal etme yetkiniz yok.", 403);
  }

  // 3. İptal Politikası: Son 2 saat kontrolü
  const now = new Date();
  const appointmentTime = new Date(appointment.slot_time);
  const diffInMilliseconds = appointmentTime - now;
  const diffInHours = diffInMilliseconds / (1000 * 60 * 60);

  if (diffInHours < 2 && diffInHours > 0) {
    throw new ErrorResponse(
      "Randevuya 2 saatten az süre kaldığı için iptal edilemez. Lütfen işletme ile iletişime geçin.",
      400,
    );
  }

  // 4. İptal İşlemini Gerçekleştir
  const cancelledAppointment = await appointmentRepo.cancelAppointment(
    appointmentId,
    userId,
  );
  return cancelledAppointment;
};

/**
 * Çalışanın kendi müsaitlik durumunu görmesi için randevu saatlerini ve durumlarını getirir.
 */
exports.getProviderSchedule = async (providerId, date) => {
  return await appointmentRepo.getProviderSchedule(providerId, date);
};

/**
 * Bugünden itibaren en yakın müsait randevu slotunu bulur (Şu anki saati kontrol eder).
 */
exports.getNextAvailableSlot = async (providerId, serviceId) => {
  const maxDaysToSearch = 30;
  const now = new Date(); // 👈 Şu anki tam zaman (Tarih + Saat)

  for (let i = 0; i < maxDaysToSearch; i++) {
    const searchDate = new Date(now);
    searchDate.setDate(now.getDate() + i);
    const dateString = searchDate.toISOString().split("T")[0];

    const slots = await this.getAvailableSlots(
      providerId,
      serviceId,
      dateString,
    );

    // Filtreleme mantığı:
    const foundSlot = slots.find((slot) => {
      if (!slot.isAvailable) return false;

      // 👈 Kritik Kontrol: Eğer baktığımız gün bugünse, slotun saati şu andan büyük olmalı
      if (i === 0) {
        const slotTime = new Date(slot.time);
        return slotTime > now; // Sadece gelecekteki saatleri döndür
      }

      return true; // Gelecek günlerdeki tüm boş slotlar uygundur
    });

    if (foundSlot) {
      return {
        date: dateString,
        slot: foundSlot,
      };
    }
  }

  throw new ErrorResponse(
    "Önümüzdeki 30 gün boyunca müsait randevu bulunamadı.",
    404,
  );
};

/**
 * Çalışanın (Provider) performans ve gelir istatistiklerini getirir.
 */
exports.getProviderAnalytics = async (userId) => {
  const stats = await appointmentRepo.getProviderStats(userId);

  // Toplam verileri hesaplayalım
  const summary = stats.reduce(
    (acc, curr) => {
      acc.totalRevenue += parseFloat(curr.total_revenue);
      acc.totalBookings += parseInt(curr.total_appointments);
      return acc;
    },
    { totalRevenue: 0, totalBookings: 0 },
  );

  return {
    summary,
    details: stats,
  };
};
