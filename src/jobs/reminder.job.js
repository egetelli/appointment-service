const cron = require("node-cron");
const pool = require("../config/db");
const { sendEmailToQueue } = require("../services/queue.service");
const logger = require("../utils/logger");

cron.schedule("* * * * *", async () => {
  try {
    const query = `
      SELECT a.id, a.slot_time, s.name as service_name, u.email, u.full_name
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      JOIN users u ON a.user_id = u.id
      WHERE a.status = 'booked' 
        AND a.reminder_sent = false
        AND a.slot_time <= NOW() + INTERVAL '24 hours'
        AND a.slot_time > NOW()
    `;

    const { rows: upcomingAppointments } = await pool.query(query);

    if (upcomingAppointments.length === 0) {
      return;
    }

    logger.info(
      `🚀 [CRON] ${upcomingAppointments.length} kişiye hatırlatma maili gönderilecek`,
    );

    for (const appt of upcomingAppointments) {
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

      await sendEmailToQueue(emailData);

      await pool.query(
        "UPDATE appointments SET reminder_sent = true WHERE id = $1",
        [appt.id],
      );
    }

    logger.info("✅ [CRON] Hatırlatma mailleri kuyruğa gönderildi");
  } catch (error) {
    logger.error(
      "❌ [CRON] Hatırlatıcı çalışırken hata oluştu:",
      error.message,
    );
  }
});

logger.info("🕒 Hatırlatıcı servisi başlatıldı.");
