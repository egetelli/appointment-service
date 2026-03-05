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
