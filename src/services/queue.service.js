const rabbitMQ = require("../config/rabbitmq");

const sendEmailToQueue = async (emailData) => {
  try {
    // 1. server.js'te açtığımız o meşhur kanalı çağırıyoruz
    const channel = rabbitMQ.getChannel();
    const queueName = "email_queue";

    // 2. assertQueue: "email_queue" adında bir kuyruk var mı kontrol et, yoksa oluştur.
    // durable: true -> RabbitMQ konteyneri çökse/yeniden başlasa bile bu kuyruk ve içindeki mesajlar silinmez, diske yazılır.
    await channel.assertQueue(queueName, { durable: true });

    // 3. Mesajı kuyruğa fırlatıyoruz
    // persistent: true -> Mesajlar RAM'de değil, kalıcı olarak diskte tutulsun (Güvenlik için)
    channel.sendToQueue(queueName, Buffer.from(JSON.stringify(emailData)), {
      persistent: true,
    });

    console.log(
      `📩 [Kuyruk] Görev RabbitMQ'ya bırakıldı: Mail -> ${emailData.to}`,
    );
  } catch (error) {
    console.error("❌ [Kuyruk] Mesaj gönderilemedi:", error.message);
  }
};

module.exports = { sendEmailToQueue };
