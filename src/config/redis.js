const redis = require("redis");

// URL Formatı: redis://[username]:[password]@[host]:[port]
// Redis'te varsayılan username yoktur, o yüzden " : " ile başlayıp şifreyi veriyoruz.
const redisUrl = `redis://:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST || "localhost"}:6379`;

const client = redis.createClient({ url: redisUrl });

// Olay dinleyicileri (Loglama için çok faydalıdır)
client.on("error", (err) => console.error("🔴 Redis Bağlantı Hatası:", err));
client.on("connect", () => console.log("🟡 Redis: Bağlantı kuruluyor..."));
client.on("ready", () =>
  console.log("🟢 Redis: Hazır ve şifreli erişim sağlandı!"),
);

(async () => {
  try {
    await client.connect();
  } catch (error) {
    console.error(
      "Redis'e bağlanılamadı, lütfen podman-compose'u kontrol et.",
      error,
    );
  }
})();

module.exports = client;
