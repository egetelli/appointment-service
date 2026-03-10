const appointmentRepo = require("../repositories/appointment.repository");
const ErrorResponse = require("../utils/errorResponse");
const redisClient = require("../config/redis");
const { sendEmailToQueue } = require("./queue.service");
const logger = require('../utils/logger');

/**
 * Müşterinin seçebileceği tüm aktif hizmetleri getirir (Redis Destekli ⚡).
 */
exports.getAvailableServices = async () => {
  const cacheKey = "services:all"; // 1. Bu veriye Redis'te vereceğimiz isim (Etiket)

  // 2. Önce Redis'e sor (Cache Hit mi, Miss mi?)
  const cachedData = await redisClient.get(cacheKey);

  if (cachedData) {
    // 3. CACHE HIT: Veri bulundu! Işık hızıyla dön.
    logger.info("⚡ [CACHE HIT] Hizmetler Redis'ten getirildi!");

    // Redis verileri sadece "String" (Metin) olarak tutar.
    // Javascript'in anlaması için onu tekrar JSON objesine çeviriyoruz.
    return JSON.parse(cachedData);
  }

  // 4. CACHE MISS: Veri Redis'te yok. Mecburen PostgreSQL'e gidiyoruz.
  logger.info(
    "🐢 [CACHE MISS] Hizmetler Veritabanından (PostgreSQL) çekiliyor...",
  );
  const services = await appointmentRepo.getAvailableServices();

  // 5. Veriyi bulduk. Bir dahakine hızlı olsun diye Redis'e kaydediyoruz!
  // setEx (Set with Expiration): Veriyi kaydet ama belli bir süre sonra otomatik sil.
  // 3600 -> 1 saat (Saniye cinsinden).
  // JSON.stringify -> Objeyi metne çevir ki Redis anlayabilsin.
  await redisClient.setEx(cacheKey, 3600, JSON.stringify(services));

  return services;
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
  logger.info("Gelen ID'ler:", { providerId, serviceId });
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

  // 4.5. Kural: Randevu saati çalışanın mesai saatleri (working hours) içinde mi? 👈 YENİ EKLENEN
  const isWithinHours = await appointmentRepo.isWithinWorkingHours(
    providerId,
    requestedStartTime,
    requestedEndTime,
  );

  if (!isWithinHours) {
    throw new ErrorResponse(
      "Seçilen saat çalışanın mesai saatleri dışındadır veya çalışan o gün hizmet vermemektedir.",
      400,
    );
  }

  // 5. Kayıt İşlemi İçin Veriyi Hazırla
  const appointmentData = {
    userId,
    providerId,
    serviceId,
    slotTime: requestedStartTime,
    endTime: requestedEndTime,
    totalPrice: serviceDetails.final_price,
  };

  // 6. ÖNCE Veritabanına Kaydet (Eğer burada hata çıkarsa aşağısı çalışmaz, güvenli kalırız)
  const appointment = await appointmentRepo.createAppointment(appointmentData);

  // 7. SONRA Redis Cache Temizliği (Batch Invalidation)
  const dateString = requestedStartTime.toISOString().split("T")[0]; // YYYY-MM-DD formatı

  // Silinecek anahtarların listesi
  const nextAvailableCacheKey = `next_available:${providerId}:${serviceId}`;
  const slotsCacheKey = `slots:${providerId}:${serviceId}:${dateString}`;
  const statsCacheKey = `stats:${providerId}`; // Çalışanın istatistiklerini temizle
  const scheduleCacheKey = `schedule:${providerId}:${dateString}`; // Çalışanın o günkü ajandasını temizle

  try {
    // Promise.all ile birbirini beklemeden hepsini eşzamanlı olarak siliyoruz (Işık hızı)
    await Promise.all([
      redisClient.del(nextAvailableCacheKey),
      redisClient.del(slotsCacheKey),
      redisClient.del(statsCacheKey),
      redisClient.del(scheduleCacheKey),
    ]);
    logger.info(
      `🧹 [REDIS] Temizlendi: ${slotsCacheKey}, ${nextAvailableCacheKey}, ${statsCacheKey}, ${scheduleCacheKey}`,
    );
  } catch (error) {
    logger.error("❌ Redis temizleme hatası:", error);
    // Cache silinemese bile veritabanına kaydedildiği için hata fırlatmıyoruz, müşteriye "başarılı" dönüyoruz.
  }

  // 👇 8. Adım - Postaneye Mektubu Bırak (RabbitMQ) 👇
  try {
    // Müşteriye gidecek mailin içeriğini hazırlıyoruz
    const emailPayload = {
      to: "ege.telli@europowerenerji.com.tr", // Gerçek uygulamada bu, kullanıcının e-posta adresi olurdu
      subject: "Randevunuz Onaylandı! 🎉",
      text: `Merhaba! Randevunuz başarıyla oluşturuldu. Detaylar:\n- Tarih: ${requestedStartTime.toLocaleString(
        "tr-TR",
      )}\n- Hizmet: ${serviceDetails.name}\n- Fiyat: ${serviceDetails.final_price} TL\nTeşekkürler!`,
      userId: userId, // Eğer bu serviste kullanıcının e-posta adresi varsa direkt onu da koyabilirsin
      type: "APPOINTMENT_CREATED",
      appointmentDetails: {
        date: requestedStartTime.toLocaleString("tr-TR"), // Tarihi okunabilir formata çevir
        price: serviceDetails.final_price,
        serviceName: serviceDetails.name, // Eğer DB'den dönüyorsa eklenebilir
      },
    };

    // RabbitMQ'ya mesajı fırlat (Müşteri bunu beklemez, anında alt satıra geçer)
    await sendEmailToQueue(emailPayload);
  } catch (error) {
    // Mail kuyruğa atılamasa bile randevu oluştuğu için sistemi çökertmiyoruz!
    logger.error(
      "❌ [Servis] RabbitMQ'ya mesaj gönderilirken hata oluştu:",
      error.message,
    );
  }

  return appointment;
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

  // 👇 5. REDIS TEMİZLİK KISMI 👇
  if (cancelledAppointment) {
    // İptal edilen randevunun tarihini ve provider bilgisini bul
    const dateString = new Date(cancelledAppointment.slot_time)
      .toISOString()
      .split("T")[0];
    const providerId = cancelledAppointment.provider_id;
    const serviceId = cancelledAppointment.service_id;

    // Sadece bu randevuyla ilgili cache'leri patlatıyoruz ki yeni biri burayı alabilsin
    const nextAvailableCacheKey = `next_available:${providerId}:${serviceId}`;
    const slotsCacheKey = `slots:${providerId}:${serviceId}:${dateString}`;
    const statsCacheKey = `stats:${providerId}`;
    const scheduleCacheKey = `schedule:${providerId}:${dateString}`;

    try {
      await Promise.all([
        redisClient.del(nextAvailableCacheKey),
        redisClient.del(slotsCacheKey),
        redisClient.del(statsCacheKey),
        redisClient.del(scheduleCacheKey),
      ]);
      logger.info(`🧹 [REDIS] İptal sonrası temizlendi: ${slotsCacheKey}`);
    } catch (error) {
      logger.error("❌ Redis temizleme hatası (İptal):", error);
    }
  }

  // 👇 6. Adım: İptal Bildirimini RabbitMQ'ya Fırlat 👇
  try {
    const cancelEmailPayload = {
      to: "ege.telli@europowerenerji.com.tr", // Gerçekte user.email olmalı
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

  return cancelledAppointment;
};

/**
 * Çalışanın kendi müsaitlik durumunu görmesi için randevu saatlerini ve durumlarını getirir.
 */
exports.getProviderSchedule = async (providerId, date) => {
  const cacheKey = `schedule:${providerId}:${date}`;

  // Önce Redis'e sor
  const cachedSchedule = await redisClient.get(cacheKey);
  if (cachedSchedule) {
    return JSON.parse(cachedSchedule);
  }

  // Veritabanından çek
  const schedule = await appointmentRepo.getProviderSchedule(providerId, date);

  // Çalışanın o günkü takvimini 5 dakikalığına kaydet
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
