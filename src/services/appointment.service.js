const appointmentRepo = require("../repositories/appointment.repository");
const ErrorResponse = require("../utils/errorResponse");
const redisClient = require("../config/redis");
const { sendEmailToQueue } = require("./queue.service");
const logger = require("../utils/logger");

/**
 * Müşterinin seçebileceği tüm aktif hizmetleri getirir.
 */
exports.getAvailableServices = async () => {
  const cacheKey = "services:all";
  const cachedData = await redisClient.get(cacheKey);

  if (cachedData) {
    logger.info("⚡ [CACHE HIT] Hizmetler Redis'ten getirildi!");
    return JSON.parse(cachedData);
  }

  logger.info(
    "🐢 [CACHE MISS] Hizmetler Veritabanından (PostgreSQL) çekiliyor...",
  );
  const services = await appointmentRepo.getAvailableServices();
  await redisClient.setEx(cacheKey, 3600, JSON.stringify(services));

  return services;
};

/**
 * Yeni randevu oluşturur veya Zaman Kapatır (Timezone Korumalı, Soketli, Cache Temizlemeli 🚀)
 */
exports.createSmartAppointment = async (appointmentPayload) => {
  // Gelen paketi (objeyi) açıyoruz: type ve endTime eklendi
  const {
    userId,
    providerId,
    serviceId,
    slotTime,
    endTime,
    guestName,
    status,
    type = "appointment",
  } = appointmentPayload;

  const isBlock = type === "block";

  logger.info(`Gelen ${isBlock ? "MOLA" : "RANDEVU"} Verileri:`, {
    providerId,
    serviceId: isBlock ? "MOLA (NULL)" : serviceId,
    type,
    guestName,
    status,
  });

  // 🛡️ 2. KİLİT (SON SAVUNMA HATTI): Normal randevularda serviceId kesinlikle olmalı!
  if (!isBlock && !serviceId) {
    logger.error(
      "🛑 Sistemsel Hata: Hizmet seçimi olmadan randevu oluşturulamaz!",
    );
    throw new ErrorResponse(
      "Müşteri randevusu için hizmet seçimi zorunludur.",
      400,
    );
  }

  // 1. Gelen UTC saati standart JS Date objesine çevir
  const requestedStartTime = new Date(slotTime);

  if (requestedStartTime < new Date()) {
    throw new ErrorResponse("Geçmiş bir tarihe işlem yapamazsınız.", 400);
  }

  // İşlem tipine göre hesaplanacak değişkenler
  let requestedEndTime;
  let finalPrice = 0;
  let finalServiceName = null; // Email ve bildirimler için

  // --- 2. SENARYO AYRIMI (RANDEVU MU? MOLA MI?) ---
  if (!isBlock) {
    // SENARYO A: NORMAL RANDEVU
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
    const durationMs = serviceDetails.duration_minutes * 60000;
    requestedEndTime = new Date(requestedStartTime.getTime() + durationMs);
    finalPrice = serviceDetails.final_price;
    finalServiceName = serviceDetails.name;
  } else {
    // SENARYO B: ZAMANI KAPAT (MOLA)
    // Eğer frontend bitiş saati (endTime) gönderdiyse onu kullan, göndermediyse varsayılan 30 dk ekle
    if (endTime) {
      requestedEndTime = new Date(endTime);
    } else {
      requestedEndTime = new Date(requestedStartTime.getTime() + 30 * 60000);
    }
    finalPrice = 0;
    finalServiceName = guestName || "[BLOKE] Zaman Kapatıldı";
  }

  // --- 3. ÇAKIŞMA (OVERLAP) KONTROLÜ (Ortak Korumamız) ---
  const isOverlap = await appointmentRepo.checkOverlap(
    providerId,
    requestedStartTime,
    requestedEndTime,
  );
  if (isOverlap) {
    throw new ErrorResponse(
      isBlock
        ? "Bu saat aralığında kayıtlı randevunuz var, bu zamanı kapatamazsınız."
        : "Seçilen çalışanın bu saatler arası doludur. Lütfen başka bir saat seçin.",
      400,
    );
  }

  // --- 4. MESAİ SAATİ KONTROLÜ (TÜRKİYE SAATİ İLE JS'DE YAPILIYOR 🇹🇷) ---
  const tzOptions = { timeZone: "Europe/Istanbul" };
  const trStartDate = new Date(
    requestedStartTime.toLocaleString("en-US", tzOptions),
  );
  const trEndDate = new Date(
    requestedEndTime.toLocaleString("en-US", tzOptions),
  );

  const dayOfWeek = trStartDate.getDay();
  const workingHours = await appointmentRepo.getWorkingHours(
    providerId,
    dayOfWeek,
  );

  if (!workingHours) {
    throw new ErrorResponse(
      isBlock
        ? "Bugün zaten mesai dışındasınız (İzinli)."
        : "Çalışan o gün hizmet vermemektedir (İzinli).",
      400,
    );
  }

  const reqStartTimeInMins =
    trStartDate.getHours() * 60 + trStartDate.getMinutes();
  const reqEndTimeInMins = trEndDate.getHours() * 60 + trEndDate.getMinutes();

  const [startH, startM] = workingHours.start_time.split(":").map(Number);
  const shiftStartInMins = startH * 60 + startM;

  const [endH, endM] = workingHours.end_time.split(":").map(Number);
  const shiftEndInMins = endH * 60 + endM;

  if (
    trStartDate.getDate() !== trEndDate.getDate() ||
    reqStartTimeInMins < shiftStartInMins ||
    reqEndTimeInMins > shiftEndInMins
  ) {
    const formatTime = (timeStr) => timeStr.substring(0, 5);
    throw new ErrorResponse(
      `Seçilen saat mesai saatleri (${formatTime(workingHours.start_time)} - ${formatTime(workingHours.end_time)}) dışındadır.`,
      400,
    );
  }

  // --- 5. KAYIT İŞLEMİ ---
  const appointmentData = {
    userId,
    providerId,
    serviceId: isBlock ? null : serviceId, // Mola ise null gidiyor
    slotTime: requestedStartTime,
    endTime: requestedEndTime,
    totalPrice: finalPrice,
    type, // Randevu tipini ekledik ('appointment' veya 'block')
    guestName: isBlock ? finalServiceName : guestName, // Mola ise "[BLOKE]" metni yazılır
    status: isBlock ? "booked" : status || "pending", // Mola direkt "booked" (dolu) olarak takvime işlenir
  };

  const rawAppointment =
    await appointmentRepo.createAppointment(appointmentData);
  const enrichedAppointment = await appointmentRepo.getAppointmentDetailsById(
    rawAppointment.id,
  );

  // --- 6. CANLI BİLDİRİM (Socket.io) ---
  let pUserId = null;
  try {
    const io = require("../config/socket").getIO();
    const providerUser =
      await appointmentRepo.getProviderUserByProviderId(providerId);
    if (providerUser) {
      pUserId = providerUser.user_id;
      io.to(pUserId).emit("new_appointment", {
        appointment: enrichedAppointment,
        message: isBlock
          ? "Zaman başarıyla kilitlendi 🔒"
          : "Yeni bir randevu eklendi! 📅",
      });
    }
  } catch (err) {
    logger.error("❌ Socket Hatası:", err.message);
  }

  // --- 7. REDIS TEMİZLİĞİ (Ortak) ---
  const dateString = requestedStartTime.toISOString().split("T")[0];
  try {
    if (!pUserId) {
      const providerUser =
        await appointmentRepo.getProviderUserByProviderId(providerId);
      pUserId = providerUser ? providerUser.user_id : providerId;
    }

    const keysToDel = [
      `next_available:${providerId}:${serviceId || "block"}`,
      `slots:${providerId}:${serviceId || "block"}:${dateString}`,
      `stats:${providerId}`,
      `stats:${pUserId}`,
      `schedule:${pUserId}:${dateString}`,
      `schedule:${pUserId}:all`,
    ];

    await Promise.all(keysToDel.map((key) => redisClient.del(key)));
    const patternKeys = await redisClient.keys(`schedule:${pUserId}:*`);
    if (patternKeys.length > 0) await redisClient.del(patternKeys);
  } catch (error) {
    logger.error("❌ Redis temizleme hatası:", error);
  }

  // --- 8. RABBITMQ EMAIL (SADECE NORMAL RANDEVULARDA GİTSİN) ---
  if (!isBlock) {
    try {
      const emailPayload = {
        to: "ege.telli@europowerenerji.com.tr", // TODO: Gerçek sistemde dinamik yap
        subject:
          status === "booked"
            ? "Yeni Randevunuz Onaylandı ✅"
            : "Randevu Talebiniz Alındı 🕒",
        text: `Merhaba! Randevu detaylarınız aşağıdadır:\n- Müşteri: ${guestName ? guestName + " (Misafir)" : "Kayıtlı Müşteri"}\n- Tarih: ${trStartDate.toLocaleString("tr-TR")}\n- Hizmet: ${finalServiceName}\n- Fiyat: ${finalPrice} TL`,
        userId: userId,
        type: "APPOINTMENT_CREATED",
        appointmentDetails: {
          date: trStartDate.toLocaleString("tr-TR"),
          price: finalPrice,
          serviceName: finalServiceName,
        },
      };
      await sendEmailToQueue(emailPayload);
    } catch (error) {
      logger.error("❌ [Servis] RabbitMQ hata:", error.message);
    }
  }

  return enrichedAppointment;
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
  const cacheKey = `slots:${providerId}:${serviceId}:${date}`;

  // Önce Redis'e bak
  const cachedSlots = await redisClient.get(cacheKey);
  if (cachedSlots) {
    return JSON.parse(cachedSlots);
  }

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

    let isAvailable = !isBooked;

    // Eğer tarih bugünse ve slotun zamanı şu andan küçükse müsait değildir
    if (isAvailable && date === new Date().toISOString().split("T")[0]) {
      if (currentSlot < new Date()) {
        isAvailable = false;
      }
    }

    // Slotu listeye ekle
    slots.push({
      time: currentSlot.toISOString(),
      isAvailable: isAvailable,
    });

    // Bir sonraki slotun başlangıcını ayarla (hizmet süresi kadar ileri sar)
    currentSlot = new Date(currentSlot.getTime() + duration * 60000);
  }

  await redisClient.setEx(cacheKey, 600, JSON.stringify(slots));

  return slots;
};

/**
 * İptal İşlemi (Tam Redis Temizliği ve Kapsamlı Rol Yönetimi eklendi)
 */
exports.cancelAppointment = async (appointmentId, user) => {
  const appointment = await appointmentRepo.getAppointmentById(appointmentId);
  if (!appointment) throw new ErrorResponse("Randevu bulunamadı.", 404);

  let currentProviderId = null;
  if (user.role === "provider") {
    const providerProfile = await appointmentRepo.getProviderByUserId(user.id);
    if (providerProfile) currentProviderId = providerProfile.id;
  }

  // 2. Kontrol Paneli
  const isOwner = appointment.user_id === user.id; // Müşteri sahibi mi?
  const isAssigned =
    currentProviderId && appointment.provider_id === currentProviderId; // Atanan uzman mı?
  const isAdmin = user.role === "admin";

  // 3. Vize Kontrolü
  if (!isOwner && !isAssigned && !isAdmin) {
    throw new ErrorResponse("Bu randevuyu iptal etme yetkiniz yok.", 403);
  }

  // 🌟 3. DÜZELTME: Geçmiş Randevu ve 2 Saat Kuralı
  const now = new Date();
  const appointmentTime = new Date(appointment.slot_time);
  const diffInHours = (appointmentTime - now) / (1000 * 60 * 60);

  // A) GEÇMİŞ RANDEVU KONTROLÜ (Admin hariç kimse geçmişi iptal edemez)
  if (appointmentTime < now && !isAdmin) {
    throw new ErrorResponse("Geçmiş tarihli randevular iptal edilemez.", 400);
  }

  // B) 2 SAAT KURALI (Sadece Müşteriye Özel)
  if (isOwner && !isAssigned && !isAdmin) {
    if (diffInHours < 2 && diffInHours > 0) {
      throw new ErrorResponse(
        "Randevuya 2 saatten az süre kaldığı için iptal edilemez.",
        400,
      );
    }
  }

  // İşlemi Veritabanında Güncelle
  const cancelledAppointment = await appointmentRepo.cancelAppointment(
    appointmentId,
    user.id, // 🌟 4. DÜZELTME: userId yerine user.id gönderiyoruz
  );

  // ==========================================
  // REDIS TEMİZLİK KISMI
  // ==========================================
  if (cancelledAppointment) {
    const dateString = new Date(cancelledAppointment.slot_time)
      .toISOString()
      .split("T")[0];
    const providerId = cancelledAppointment.provider_id;
    const serviceId = cancelledAppointment.service_id;

    try {
      const providerUser =
        await appointmentRepo.getProviderUserByProviderId(providerId);
      const pUserId = providerUser ? providerUser.user_id : providerId;

      const keysToDel = [
        `next_available:${providerId}:${serviceId}`,
        `slots:${providerId}:${serviceId}:${dateString}`,
        `stats:${providerId}`,
        `stats:${pUserId}`,
        `schedule:${pUserId}:${dateString}`,
        `schedule:${pUserId}:all`,
      ];

      await Promise.all(keysToDel.map((key) => redisClient.del(key)));

      const patternKeys = await redisClient.keys(`schedule:${pUserId}:*`);
      if (patternKeys.length > 0) await redisClient.del(patternKeys);
    } catch (error) {
      logger.error("❌ Redis temizleme hatası (İptal):", error);
    }
  }

  // ==========================================
  // RABBITMQ EMAIL BİLDİRİMİ KISMI
  // ==========================================
  try {
    const cancelEmailPayload = {
      // TODO: Gerçekte bu mail adresi dinamik olmalı (iptal edilen müşterinin maili)
      to: "ege.telli@europowerenerji.com.tr",
      subject: "Randevunuz İptal Edildi ⚠️",
      text: `Randevunuz başarıyla iptal edilmiştir. Detaylar:\n- Tarih: ${new Date(cancelledAppointment.slot_time).toLocaleString("tr-TR")}\nTekrar görüşmek dileğiyle.`,
      type: "APPOINTMENT_CANCELLED",
      appointmentDetails: {
        date: new Date(cancelledAppointment.slot_time).toLocaleString("tr-TR"),
        serviceName:
          cancelledAppointment.service_name || "Hizmet Bilgisi Alınamadı",
        price: cancelledAppointment.total_price || 0,
        status: "CANCELLED",
      },
    };

    await sendEmailToQueue(cancelEmailPayload);
    logger.info(
      `📩 [Kuyruk] İptal bildirimi RabbitMQ'ya bırakıldı: ${appointmentId}`,
    );
  } catch (error) {
    logger.error("❌ [Servis] İptal maili kuyruğa atılamadı:", error.message);
  }

  // ==========================================
  // SOCKET.IO ANLIK BİLDİRİM KISMI
  // ==========================================
  try {
    const io = require("../config/socket").getIO();

    // Uzmanın user_id'sini bul
    const providerUser = await appointmentRepo.getProviderUserByProviderId(
      cancelledAppointment.provider_id,
    );
    const pUserId = providerUser ? providerUser.user_id : null;

    // 🌟 5. DÜZELTME: Soket gönderiminde de user.id kullanıyoruz
    // 1. İptal eden Müşteri ise Uzmana haber ver
    if (pUserId && user.id !== pUserId) {
      io.to(pUserId).emit("appointment_cancelled", {
        appointmentId: appointmentId,
        status: "cancelled",
        message: "Bir müşteriniz randevusunu iptal etti.",
      });
    }

    // 2. İptal eden Uzman ise Müşteriye haber ver
    if (user.id !== cancelledAppointment.user_id) {
      io.to(cancelledAppointment.user_id).emit("appointment_cancelled", {
        appointmentId: appointmentId,
        status: "cancelled",
        message: "Randevunuz uzman tarafından iptal edildi.",
      });
    }

    logger.info(`📡 [Socket] İptal bildirimi ilgili kişilere gönderildi.`);
  } catch (error) {
    logger.error("❌ Socket bildirim hatası (İptal):", error.message);
  }

  return cancelledAppointment;
};

/**
 * Çalışanın randevu saatlerini getirir (UNDEFINED KARMAŞASI ÇÖZÜLDÜ)
 */
exports.getProviderSchedule = async (userId, date) => {
  // Eğer tarih yoksa (Dashboard ise) cache ismini 'all' yapalım
  const dateKey = date ? date : "all";
  const cacheKey = `schedule:${userId}:${dateKey}`;

  const cachedSchedule = await redisClient.get(cacheKey);
  if (cachedSchedule) {
    return JSON.parse(cachedSchedule);
  }

  const schedule = await appointmentRepo.getProviderSchedule(userId, date);
  await redisClient.setEx(cacheKey, 300, JSON.stringify(schedule));

  return schedule;
};

/**
 * Bugünden itibaren en yakın müsait randevu slotunu bulur (Redis Destekli ⚡).
 */
exports.getNextAvailableSlot = async (providerId, serviceId) => {
  // 1. Bu isteğe özel benzersiz bir anahtar oluşturuyoruz
  const cacheKey = `next_available:${providerId}:${serviceId}`;

  // 2. Önce Redis'e soralım
  const cachedData = await redisClient.get(cacheKey);

  if (cachedData) {
    logger.info(
      `⚡ [CACHE HIT] En yakın müsaitlik Redis'ten geldi: ${cacheKey}`,
    );
    return JSON.parse(cachedData);
  }

  logger.info(`🐢 [CACHE MISS] Ağır hesaplama yapılıyor...: ${cacheKey}`);

  // --- Mevcut Hesaplama Mantığı ---
  const maxDaysToSearch = 30;
  const now = new Date();

  for (let i = 0; i < maxDaysToSearch; i++) {
    const searchDate = new Date(now);
    searchDate.setDate(now.getDate() + i);
    const dateString = searchDate.toISOString().split("T")[0];

    const slots = await this.getAvailableSlots(
      providerId,
      serviceId,
      dateString,
    );

    const foundSlot = slots.find((slot) => {
      if (!slot.isAvailable) return false;
      if (i === 0) {
        const slotTime = new Date(slot.time);
        return slotTime > now;
      }
      return true;
    });

    if (foundSlot) {
      const result = { date: dateString, slot: foundSlot };

      // 3. Bulduğumuz sonucu Redis'e 5 dakikalığına (300 sn) kaydedelim
      // Çok uzun tutmuyoruz çünkü başka biri randevu alırsa bu bilgi eskir
      await redisClient.setEx(cacheKey, 300, JSON.stringify(result));

      return result;
    }
  }

  throw new ErrorResponse(
    "Önümüzdeki 30 gün boyunca müsait randevu bulunamadı.",
    404,
  );
};

/**
 * Çalışanın (Provider) performans ve gelir istatistiklerini getirir (Redis Destekli ⚡).
 */
exports.getProviderAnalytics = async (userId) => {
  // 1. Giriş yapan çalışanın (User) aslında hangi Provider olduğunu bul!
  const provider = await appointmentRepo.getProviderIdByUserId(userId);

  if (!provider) {
    throw new ErrorResponse("Çalışan (Provider) profili bulunamadı.", 404);
  }

  const providerId = provider.id; // İşte asıl anahtarımız!

  // 2. Artık cache'i tüm sistemle uyumlu olarak providerId ile tutuyoruz
  const cacheKey = `stats:${providerId}`;

  const cachedStats = await redisClient.get(cacheKey);

  if (cachedStats) {
    logger.info(
      `⚡ [CACHE HIT] İstatistikler Redis'ten ışık hızıyla geldi: ${cacheKey}`,
    );
    return JSON.parse(cachedStats);
  }

  logger.info(`🐢 [CACHE MISS] İstatistikler hesaplanıyor...: ${cacheKey}`);

  // Mevcut veritabanı sorgumuz zaten userId ile çalışıyordu, oraya dokunmuyoruz.
  const stats = await appointmentRepo.getProviderStats(userId);

  const summary = stats.reduce(
    (acc, curr) => {
      acc.totalRevenue += parseFloat(curr.total_revenue);
      acc.totalBookings += parseInt(curr.total_appointments);
      return acc;
    },
    { totalRevenue: 0, totalBookings: 0 },
  );

  const result = { summary, details: stats };

  await redisClient.setEx(cacheKey, 1800, JSON.stringify(result));

  return result;
};

/**
 * Randevuyu onaylar (Statüyü 'booked' yapar, Socket fırlatır, Cache temizler)
 */
exports.approveAppointment = async (appointmentId, userId) => {
  const provider = await appointmentRepo.getProviderIdByUserId(userId);
  if (!provider) throw new ErrorResponse("Uzman profili bulunamadı.", 404);

  const appointment = await appointmentRepo.getAppointmentById(appointmentId);
  if (!appointment) throw new ErrorResponse("Randevu bulunamadı.", 404);
  if (appointment.provider_id !== provider.id)
    throw new ErrorResponse("Yetkiniz yok.", 403);

  const updatedAppointment = await appointmentRepo.updateAppointmentStatus(
    appointmentId,
    "booked",
  );

  // 🧹 REDİS TEMİZLİK (Garantili Silme)
  const dateString = new Date(updatedAppointment.slot_time)
    .toISOString()
    .split("T")[0];

  try {
    const keysToDel = [
      `next_available:${provider.id}:${updatedAppointment.service_id}`,
      `slots:${provider.id}:${updatedAppointment.service_id}:${dateString}`,
      `stats:${provider.id}`,
      `stats:${userId}`, // Login olan kullanıcının ID'si
      `schedule:${userId}:${dateString}`, // O güne özel ajanda
      `schedule:${userId}:all`, // Dashboard Yaklaşanlar listesi! (En önemli satır bu)
    ];

    await Promise.all(keysToDel.map((key) => redisClient.del(key)));

    // İşimi şansa bırakmıyorum, pattern ile hepsini siliyorum.
    const patternKeys = await redisClient.keys(`schedule:${userId}:*`);
    if (patternKeys.length > 0) {
      await redisClient.del(patternKeys);
    }

    logger.info(`🧹 [REDIS] Onay sonrası takvim cache'leri temizlendi.`);
  } catch (error) {
    logger.error("❌ Redis temizleme hatası (Onay):", error);
  }

  // 📣 CANLI BİLDİRİM (Socket.io)
  try {
    const io = require("../config/socket").getIO();
    io.to(updatedAppointment.user_id).emit("appointment_updated", {
      action: "APPROVED",
      appointmentId: appointmentId,
      status: "booked",
      message: "Randevunuz uzman tarafından onaylandı! 🎉",
    });
  } catch (error) {
    logger.error("❌ Socket bildirim hatası:", error.message);
  }

  return updatedAppointment;
};

/**
 * Uzmanın (Provider) benzersiz müşterilerini ve CRM istatistiklerini getirir
 */
exports.getProviderClients = async (userId) => {
  // 1. Önce login olan user_id'den, bu kişinin 'provider_id'sini buluyoruz
  const provider = await appointmentRepo.getProviderIdByUserId(userId);

  if (!provider) {
    throw new ErrorResponse("Uzman profili bulunamadı.", 404);
  }

  // 2. Repository üzerinden müşterileri çekiyoruz
  const clients = await appointmentRepo.getProviderClients(provider.id);

  // 3. Veriyi controller'a geri döndürüyoruz
  return clients;
};

/**
 * Uzmana ait detaylı analitik verileri getirir (Özet kartları, ciro grafiği, popüler hizmetler)
 */
exports.getProviderAnalytics = async (userId) => {
  const provider = await appointmentRepo.getProviderByUserId(userId);
  if (!provider) throw new ErrorResponse("Uzman bulunamadı", 404);
  return await appointmentRepo.getProviderAnalytics(provider.id);
};

/**
 *
 * Müşteri arama fonksiyonu (CRM için) - En az 2 karakterle arama yapar, Redis destekli olabilir
 */
exports.searchCustomers = async (searchTerm) => {
  if (!searchTerm || searchTerm.length < 2) return []; // En az 2 harf girilmeli
  return await appointmentRepo.searchCustomers(searchTerm);
};

/**
 *
 * Müşteri rezervasyon ekranı için tüm aktif uzmanların günlük kolektif müsaitlik durumunu getirir.
 * Belirli bir tarih verilmezse otomatik olarak bugünün tarihini baz alır.
 * Gizlilik gereği mola ve özel iş detaylarını maskeler.
 */
exports.fetchCollectiveAvailability = async (date) => {
  let queryDate = date;

  // Tarih parametresi gelmediyse bugünü (YYYY-MM-DD) olarak ayarla
  if (!queryDate) {
    const today = new Date();
    queryDate = today.toISOString().split("T")[0];
  }

  return await appointmentRepo.getCollectiveAvailability(queryDate);
};
