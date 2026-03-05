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
  // Veritabanında güncelleme yapmayı dene
  const cancelledAppointment = await appointmentRepo.cancelAppointment(
    appointmentId,
    userId,
  );

  // Eğer undefined döndüyse, randevu ya yoktur ya da bu kullanıcının değildir
  if (!cancelledAppointment) {
    throw new ErrorResponse(
      "Randevu bulunamadı veya bu randevuyu iptal etme yetkiniz yok.",
      404,
    );
  }

  // TODO: İleride buraya RabbitMQ entegrasyonu gelecek (Örn: İptal E-postası gönder)

  return cancelledAppointment;
};

/**
 * Çalışanın kendi müsaitlik durumunu görmesi için randevu saatlerini ve durumlarını getirir.
 */
exports.getProviderSchedule = async (providerId, date) => {
  return await appointmentRepo.getProviderSchedule(providerId, date);
};