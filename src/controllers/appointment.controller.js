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
 * @desc  Yeni randevu oluştur (Müşteri veya Uzman tarafından)
 * @route POST /api/appointments
 * @access Private
 */
exports.bookAppointment = asyncHandler(async (req, res) => {
  // Uzmansa customerId body'den gelecek, Müşteriyse kendi ID'si olacak
  const { providerId, serviceId, slotTime, customerId } = req.body;

  let finalUserId = req.user.id; // Varsayılan: İsteği atan kişi
  let initialStatus = "pending"; // Müşteri alıyorsa onay bekler

  // Eğer isteği atan bir uzmansa:
  if (req.user.role === "provider" || req.user.role === "admin") {
    if (!customerId) {
      throw new ErrorResponse(
        "Lütfen randevu oluşturulacak müşteriyi seçin.",
        400,
      );
    }
    finalUserId = customerId; // Müşteri ID'sini body'den al
    initialStatus = "confirmed"; // Uzman kendi ekliyorsa direkt onaylıdır
  }

  // İş mantığına gönderiyoruz
  const appointment = await appointmentService.createSmartAppointment(
    finalUserId,
    providerId,
    serviceId,
    slotTime,
    initialStatus, // Yeni ekledik
  );

  res.status(201).json({
    success: true,
    message:
      initialStatus === "confirmed"
        ? "Manuel randevu başarıyla eklendi ve onaylandı."
        : "Randevunuz başarıyla oluşturuldu.",
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

/**
 * @desc  Giriş yapmış kullanıcının randevusunu iptal et (status -> 'cancelled')
 * @route PATCH /api/appointments/:id/cancel
 * @access Private
 */
exports.cancelAppointment = asyncHandler(async (req, res) => {
  const appointmentId = req.params.id;

  const cancelledAppointment = await appointmentService.cancelAppointment(
    appointmentId,
    req.user,
  );

  res.status(200).json({
    success: true,
    message: "Randevunuz başarıyla iptal edildi.",
    data: cancelledAppointment,
  });
});

/**
 * @desc  Çalışanın belirli bir günkü ajandasını getir
 * @route GET /api/appointments/provider/schedule
 * @access Private (Sadece Provider/Admin)
 */
exports.getProviderSchedule = asyncHandler(async (req, res) => {
  const { date } = req.query;
  const providerId = req.user.id; // Token'dan gelen id'nin provider olduğunu varsayıyoruz

  const schedule = await appointmentService.getProviderSchedule(
    providerId,
    date,
  );

  res.status(200).json({
    success: true,
    count: schedule.length,
    data: schedule,
  });
});

/**
 * @desc  En yakın müsait randevu tarihini ve saatini getir
 * @route GET /api/appointments/next-available
 * @access Public
 */
exports.getNextAvailableSlot = asyncHandler(async (req, res) => {
  const { providerId, serviceId } = req.query;

  if (!providerId || !serviceId) {
    throw new ErrorResponse("Lütfen providerId ve serviceId belirtin.", 400);
  }

  const nextSlot = await appointmentService.getNextAvailableSlot(
    providerId,
    serviceId,
  );

  res.status(200).json({
    success: true,
    data: nextSlot,
  });
});

/**
 * @desc  Çalışan için hizmet ve gelir istatistiklerini getir
 * @route GET /api/appointments/stats/my-performance
 * @access Private (Provider)
 */
exports.getMyPerformance = asyncHandler(async (req, res) => {
  const stats = await appointmentService.getProviderAnalytics(req.user.id);

  res.status(200).json({
    success: true,
    data: stats,
  });
});

/**
 * @desc  Randevuyu onaylar
 * @route PATCH /api/appointments/:id/approve
 * @access Private (Provider)
 */
exports.approveAppointment = asyncHandler(async (req, res) => {
  const appointment = await appointmentService.approveAppointment(
    req.params.id,
    req.user.id,
  );

  res.status(200).json({
    success: true,
    message: "Randevu başarıyla onaylandı.",
    data: appointment,
  });
});

/**
 * @desc  Uzmanın müşteri listesini (CRM) getirir
 * @route GET /api/appointments/clients
 * @access Private (Sadece Provider)
 */
exports.getProviderClients = asyncHandler(async (req, res) => {
  // Bütün iş yükünü ve mantığı Service katmanına devrettik
  const clients = await appointmentService.getProviderClients(req.user.id);

  res.status(200).json({
    success: true,
    data: clients,
  });
});
