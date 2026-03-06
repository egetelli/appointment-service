const amqp = require("amqplib");
const nodemailer = require("nodemailer");

// Ufak bir bekleme fonksiyonu
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || "sandbox.smtp.mailtrap.io",
  port: process.env.MAIL_PORT || 2525,
  auth: {
    user: process.env.MAIL_USER || "54d2925d1902bb",
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
        // Kuyruktan gelen string veriyi JSON objesine çeviriyoruz
        const emailData = JSON.parse(msg.content.toString());
        const recipient = emailData.to || "ege.telli@europowerenerji.com.tr";

        console.log(`📩 [Worker] Yeni görev işleniyor. Alıcı: ${recipient}`);

        try {
          // Ücretsiz plan sınırına takılmamak için her mail arası 2 saniye bekle
          await sleep(2000);

          // Payload'dan gelen verileri HTML şablonuna yerleştiriyoruz
          const htmlContent = `
            <div style="background-color: #f4f5f7; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6;">
              <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">

                <div style="background-color: #0f172a; padding: 35px 30px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.5px;">Randevu Onayı</h1>
                </div>

                <div style="padding: 40px 30px;">
                  <div style="display: inline-block; background-color: #dcfce7; color: #166534; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 600; margin-bottom: 25px;">
                    ✅ Başarıyla Onaylandı
                  </div>

                  <h2 style="color: #111827; font-size: 20px; margin-top: 0; margin-bottom: 15px;">Merhaba,</h2>
                  <p style="color: #4b5563; font-size: 16px; margin-bottom: 35px;">
                    Randevunuz sistemimize başarıyla kaydedildi. Sizi ağırlamak için sabırsızlanıyoruz. Lütfen aşağıdaki randevu detaylarını kontrol ediniz.
                  </p>

                  <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 25px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                      
                      <tr>
                        <td width="35" style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;"><span style="font-size: 22px;">📅</span></td>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 13px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Tarih</td>
                        <td align="right" style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-weight: 600; font-size: 15px;">${emailData.appointmentDetails?.date || "Belirtilmedi"}</td>
                      </tr>
                      
                      <tr>
                        <td width="35" style="padding: 16px 0 12px; border-bottom: 1px solid #e2e8f0;"><span style="font-size: 22px;">✨</span></td>
                        <td style="padding: 16px 0 12px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 13px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Hizmet</td>
                        <td align="right" style="padding: 16px 0 12px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-weight: 600; font-size: 15px;">${emailData.appointmentDetails?.serviceName || "Belirtilmedi"}</td>
                      </tr>
                      
                      <tr>
                        <td width="35" style="padding: 16px 0 0;"><span style="font-size: 22px;">💳</span></td>
                        <td style="padding: 16px 0 0; color: #64748b; font-size: 13px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Tutar</td>
                        <td align="right" style="padding: 16px 0 0; color: #2563eb; font-weight: 700; font-size: 19px;">${emailData.appointmentDetails?.price || "0"} TL</td>
                      </tr>

                    </table>
                  </div>

                  <p style="color: #4b5563; font-size: 15px; margin-top: 35px; line-height: 1.6;">
                    Randevu saatinizden 10 dakika önce gelmenizi rica ederiz. Herhangi bir değişiklik veya iptal talebiniz için bizimle iletişime geçebilirsiniz.
                  </p>
                </div>

                <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 25px; text-align: center;">
                  <p style="margin: 0; color: #94a3b8; font-size: 13px;">
                    Bu e-posta sistem tarafından otomatik olarak gönderilmiştir.<br> Lütfen bu mesaja yanıt vermeyiniz.
                  </p>
                </div>

              </div>
            </div>
          `;

          await transporter.sendMail({
            from: '"Randevu Sistemi" <no-reply@randevu.com>',
            to: recipient,
            subject: emailData.subject || "Randevunuz Onaylandı! 🎉",
            text: emailData.text || "Randevunuz başarıyla oluşturulmuştur.",
            html: htmlContent, // Şık tasarım için HTML parametresini ekledik
          });

          console.log(`✅ [Worker] Mail başarıyla gönderildi: ${recipient}`);
          channel.ack(msg); // Mesaj başarıyla iletildi, RabbitMQ'dan silinebilir
        } catch (mailError) {
          console.error(
            "❌ [Worker] Mail gönderilirken hata:",
            mailError.message,
          );
        }
      }
    });
  } catch (error) {
    console.error("❌ [Worker] Başlatılamadı:", error.message);
  }
}

startWorker();
