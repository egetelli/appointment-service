const cron = require("node-cron");
const pool = require("../config/db"); // DB bağlantı dosyanın yolu
const { sendEmailToQueue } = require("../services/queue.service"); // Senin harika RabbitMQ servisin!

// Şu an test için HER DAKİKA çalışacak şekilde ayarlı (* * * * *).
// Canlıya alırken bunu "0 * * * *" (her saat başı) olarak değiştirebilirsin.
cron.schedule("* * * * *", async () => {
  console.log("⏰ [CRON] Yaklaşan randevular kontrol ediliyor...");

  try {
    // 1. Durumu 'scheduled' olan, hatırlatıcı atılmamış ve
    // randevusuna 24 saatten AZ kalmış kişileri bul
    const query = `
      SELECT a.id, a.slot_time, s.name as service_name, u.email, u.full_name
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      JOIN users u ON a.user_id = u.id
      WHERE a.status = 'booked' 
        AND a.reminder_sent = false
        AND a.slot_time <= NOW() + INTERVAL '24 hours'
        AND a.slot_time > NOW() -- Geçmiş randevulara atmasın
    `;

    const { rows: upcomingAppointments } = await pool.query(query);

    if (upcomingAppointments.length === 0) {
      return console.log(
        "💤 [CRON] Hatırlatma atılacak yeni randevu bulunamadı.",
      );
    }

    console.log(
      `🚀 [CRON] ${upcomingAppointments.length} kişiye hatırlatma maili atılacak...`,
    );

    // 2. Bulunan herkes için senin RabbitMQ kuyruğuna (emailData formatında) mail fırlat
    for (const appt of upcomingAppointments) {
      // Senin RabbitMQ servisine tam uyumlu "emailData" objesi
      const emailData = {
        to: appt.email,
        subject: "Randevunuz Yaklaşıyor ⏰",
        type: "APPOINTMENT_REMINDER",
        appointmentDetails: {
          customerName: appt.full_name,
          date: new Date(appt.slot_time).toLocaleString("tr-TR"),
          serviceName: appt.service_name,
          status: "REMINDER",
        },
      };

      // Kuyruğa gönderiyoruz!
      await sendEmailToQueue(emailData);

      // 3. Spam koruması: Aynı kişiye tekrar mail gitmemesi için durumu güncelle
      await pool.query(
        "UPDATE appointments SET reminder_sent = true WHERE id = $1",
        [appt.id],
      );
    }

    console.log(
      "✅ [CRON] Tüm hatırlatma mailleri kuyruğa başarıyla iletildi!",
    );
  } catch (error) {
    console.error(
      "❌ [CRON] Hatırlatıcı çalışırken hata oluştu:",
      error.message,
    );
  }
});

console.log("🕒 Hatırlatıcı (Cron Job) servisi başlatıldı.");
