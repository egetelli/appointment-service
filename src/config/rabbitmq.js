const amqp = require("amqplib");

class RabbitMQConnection {
  constructor() {
    this.connection = null;
    this.channel = null;

    // .env dosyasından URL'i alır, bulamazsa varsayılan local adrese bağlanır
    this.url = process.env.RABBITMQ_URL;
  }

  async connect() {
    try {
      if (!this.connection) {
        // 1. RabbitMQ sunucusuna bağlan
        this.connection = await amqp.connect(this.url);

        // 2. Mesajları göndereceğimiz bir İletişim Kanalı (Channel) aç
        this.channel = await this.connection.createChannel();

        console.log("🐇 [RabbitMQ] Başarıyla bağlanıldı ve kanal açıldı!");

        // Bağlantı koparsa uygulamayı çökertmemek için hata dinleyicisi
        this.connection.on("error", (err) => {
          console.error("❌ [RabbitMQ] Bağlantı koptu!", err);
          this.connection = null;
          setTimeout(() => this.connect(), 5000); // 5 saniye sonra tekrar dene
        });
      }
      return this.channel;
    } catch (error) {
      // error.message ekleyerek "Connection refused" mı yoksa "Invalid URL" mi olduğunu anlayacağız
      console.error("❌ [RabbitMQ] Bağlantı Hatası:", error.message);
      setTimeout(() => this.connect(), 5000);
    }
  }

  // Diğer dosyalardan (Servislerden) kanalı çağırmak için kullanacağımız metot
  getChannel() {
    if (!this.channel) {
      throw new Error("RabbitMQ kanalı henüz oluşturulmadı. Lütfen bekleyin.");
    }
    return this.channel;
  }
}

// Singleton Yapı: Tüm proje boyunca sadece tek bir tavşan bağlantısı kullanılsın
module.exports = new RabbitMQConnection();
