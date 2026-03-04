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
 * @desc  Yeni randevu oluştur (Notlar ve Güncel Fiyat kaydı ile)
 * @route POST /api/appointments
 * @access Private (Kullanıcı giriş yapmış olmalı)
 */
exports.bookAppointment = asyncHandler(async (req, res) => {
  // notes alanını body'den alıyoruz
  const { serviceId, slotTime, notes } = req.body;
  const userId = req.user.id; // authenticate middleware'inden geliyor

  // notes bilgisini servise iletiyoruz
  const appointment = await appointmentService.createSmartAppointment(
    userId,
    serviceId,
    slotTime,
    notes,
  );

  res.status(201).json({
    success: true,
    message: "Randevunuz başarıyla oluşturuldu ve onay bekliyor.",
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
