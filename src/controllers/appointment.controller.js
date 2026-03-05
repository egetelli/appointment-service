const appointmentService = require("../services/appointment.service");
const asyncHandler = require("../middleware/asyncHandler");

/**
 * @desc  Tüm aktif hizmetleri listele
 * @route GET /api/appointments/services
 * @access Public
 */
exports.getServices = asyncHandler(async (req, res) => {
  const services = await appointmentService.getAvailableServices();

  res.status(200).json({
    success: true,
    count: services.length,
    data: services,
  });
});

/**
 * @desc  Yeni randevu oluştur
 * @route POST /api/appointments
 * @access Private
 */
exports.bookAppointment = asyncHandler(async (req, res) => {
  // Artık providerId de almak zorundayız
  const { providerId, serviceId, slotTime } = req.body;
  const userId = req.user.id;

  // İş mantığına gönderiyoruz
  const appointment = await appointmentService.createSmartAppointment(
    userId,
    providerId,
    serviceId,
    slotTime,
  );

  res.status(201).json({
    success: true,
    message: "Randevunuz başarıyla oluşturuldu.",
    data: appointment,
  });
});

/**
 * @desc  Giriş yapmış kullanıcının kendi randevularını getir
 * @route GET /api/appointments/my
 * @access Private
 */
exports.getMyAppointments = asyncHandler(async (req, res) => {
  const appointments = await appointmentService.getUserAppointments(
    req.user.id,
  );

  res.status(200).json({
    success: true,
    count: appointments.length,
    data: appointments,
  });
});

/**
 * @desc  Belirli bir çalışan ve tarih için müsait/dolu randevu saatlerini listele
 * @route GET /api/appointments/available-slots
 * @access Public
 */
exports.getAvailableSlots = asyncHandler(async (req, res) => {
  // GET isteklerinde veriler req.query üzerinden gelir (?providerId=...&date=...)
  const { providerId, serviceId, date } = req.query;

  // Parametrelerin eksik olma durumuna karşı basit bir kontrol
  if (!providerId || !serviceId || !date) {
    return res.status(400).json({
      success: false,
      message: "Lütfen providerId, serviceId ve date parametrelerini gönderin.",
    });
  }

  // İş mantığına (Servise) gönder
  const slots = await appointmentService.getAvailableSlots(
    providerId,
    serviceId,
    date,
  );

  res.status(200).json({
    success: true,
    count: slots.length,
    data: slots,
  });
});
