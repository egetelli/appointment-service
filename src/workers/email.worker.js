const amqp = require("amqplib");
const nodemailer = require("nodemailer");

// Mailtrap ücretsiz plan sınırı için bekleme fonksiyonu
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || "sandbox.smtp.mailtrap.io",
  port: process.env.MAIL_PORT || 2525,
  auth: {
    user: process.env.MAIL_USER || "54d2925d1902bb", // Kendi kimlik bilgilerin
    pass: process.env.MAIL_PASS || "71472ba9b9e148",
  },
});

async function startWorker() {
  try {
    const rabbitmqUrl =
      process.env.RABBITMQ_URL || "amqp://admin:admin@rabbitmq:5672";
    const connection = await amqp.connect(rabbitmqUrl);
    const channel = await connection.createChannel();
    const queueName = "email_queue";

    await channel.assertQueue(queueName, { durable: true });
    channel.prefetch(1);

    console.log(`👷 [Worker] Postacı hazır! '${queueName}' dinleniyor...`);

    channel.consume(queueName, async (msg) => {
      if (msg !== null) {
        try {
          const emailData = JSON.parse(msg.content.toString());
          const recipient = emailData.to || "ege.telli@europowerenerji.com.tr";
          const type = emailData.type;

          console.log(`📩 [Worker] İşlem tipi: ${type} | Alıcı: ${recipient}`);

          // --- 🎨 DİNAMİK TEMA (ONAY / İPTAL / HATIRLATMA) ---
          let themeColor,
            headerTitle,
            badgeText,
            badgeBg,
            badgeColor,
            mainMessage,
            footerMessage;

          if (type === "APPOINTMENT_CANCELLED") {
            // İPTAL TEMASI (Kırmızı)
            themeColor = "#e11d48";
            headerTitle = "Randevu İptali";
            badgeText = "⚠️ İptal Edildi";
            badgeBg = "#ffe4e6";
            badgeColor = "#9f1239";
            mainMessage =
              "İsteğiniz üzerine randevunuz iptal edilmiştir. Detaylar aşağıda yer almaktadır.";
            footerMessage =
              "Farklı bir zaman dilimi için tekrar randevu oluşturabilirsiniz.";
          } else if (type === "APPOINTMENT_REMINDER") {
            // HATIRLATMA TEMASI (Turuncu / Sarı)
            themeColor = "#f59e0b";
            headerTitle = "Randevu Hatırlatması";
            badgeText = "⏰ Yaklaşıyor";
            badgeBg = "#fef3c7";
            badgeColor = "#b45309";
            mainMessage =
              "Yaklaşan randevunuzu hatırlatmak istedik. Sizi ağırlamak için sabırsızlanıyoruz!";
            footerMessage =
              "Eğer katılamayacaksanız, lütfen sistem üzerinden iptal işlemini gerçekleştirin.";
          } else {
            // ONAY TEMASI (Lacivert / Yeşil) -> Varsayılan ("APPOINTMENT_CREATED" vs.)
            themeColor = "#0f172a";
            headerTitle = "Randevu Onayı";
            badgeText = "✅ Başarıyla Onaylandı";
            badgeBg = "#dcfce7";
            badgeColor = "#166534";
            mainMessage =
              "Randevunuz başarıyla kaydedildi. Detayları aşağıda bulabilirsiniz.";
            footerMessage =
              "Randevu saatinizden 10 dakika önce gelmenizi rica ederiz.";
          }

          await sleep(2000); // Rate limit koruması

          // HTML Şablonu (Renkler ve Metinler dinamikleşti)
          const htmlContent = `
            <div style="background-color: #f4f5f7; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6;">
              <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">

                <div style="background-color: ${themeColor}; padding: 35px 30px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.5px;">${headerTitle}</h1>
                </div>

                <div style="padding: 40px 30px;">
                  <div style="display: inline-block; background-color: ${badgeBg}; color: ${badgeColor}; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 600; margin-bottom: 25px;">
                    ${badgeText}
                  </div>

                  <h2 style="color: #111827; font-size: 20px; margin-top: 0; margin-bottom: 15px;">Merhaba ${emailData.appointmentDetails?.customerName || ""},</h2>
                  <p style="color: #4b5563; font-size: 16px; margin-bottom: 35px;">
                    ${mainMessage}
                  </p>

                  <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 25px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                      <tr>
                        <td width="35" style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;"><span style="font-size: 22px;">📅</span></td>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 13px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Tarih</td>
                        <td align="right" style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-weight: 600; font-size: 15px;">${emailData.appointmentDetails?.date || "Belirtilmedi"}</td>
                      </tr>
                      <tr>
                        <td width="35" style="padding: 16px 0 12px; border-bottom: ${emailData.appointmentDetails?.price ? "1px solid #e2e8f0" : "none"};"><span style="font-size: 22px;">✨</span></td>
                        <td style="padding: 16px 0 12px; border-bottom: ${emailData.appointmentDetails?.price ? "1px solid #e2e8f0" : "none"}; color: #64748b; font-size: 13px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Hizmet</td>
                        <td align="right" style="padding: 16px 0 12px; border-bottom: ${emailData.appointmentDetails?.price ? "1px solid #e2e8f0" : "none"}; color: #0f172a; font-weight: 600; font-size: 15px;">${emailData.appointmentDetails?.serviceName || "Belirtilmedi"}</td>
                      </tr>
                      ${
                        emailData.appointmentDetails?.price
                          ? `
                      <tr>
                        <td width="35" style="padding: 16px 0 0;"><span style="font-size: 22px;">💳</span></td>
                        <td style="padding: 16px 0 0; color: #64748b; font-size: 13px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Tutar</td>
                        <td align="right" style="padding: 16px 0 0; color: ${type === "APPOINTMENT_CANCELLED" ? "#4b5563" : "#2563eb"}; font-weight: 700; font-size: 19px;">${emailData.appointmentDetails.price} TL</td>
                      </tr>
                      `
                          : ""
                      }
                    </table>
                  </div>

                  <p style="color: #4b5563; font-size: 15px; margin-top: 35px; line-height: 1.6;">
                    ${footerMessage}
                  </p>
                </div>

                <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 25px; text-align: center;">
                  <p style="margin: 0; color: #94a3b8; font-size: 13px;">
                    Bu e-posta sistem tarafından otomatik olarak gönderilmiştir.
                  </p>
                </div>
              </div>
            </div>
          `;

          await transporter.sendMail({
            from: '"Randevu Sistemi" <no-reply@randevu.com>',
            to: recipient,
            subject: emailData.subject || headerTitle,
            text: emailData.text || mainMessage,
            html: htmlContent,
          });

          console.log(`✅ [Worker] Başarıyla gönderildi: ${recipient}`);
          channel.ack(msg);
        } catch (processError) {
          console.error(
            "❌ [Worker] Mesaj işleme hatası:",
            processError.message,
          );
        }
      }
    });
  } catch (error) {
    console.error("❌ [Worker] Kritik hata:", error.message);
  }
}

startWorker();
