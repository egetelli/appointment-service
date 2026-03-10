const redis = require("redis");
const logger = require('../utils/logger');

// URL Formatı: redis://[username]:[password]@[host]:[port]
// Redis'te varsayılan username yoktur, o yüzden " : " ile başlayıp şifreyi veriyoruz.
const redisUrl = `redis://:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST || "localhost"}:6379`;

const client = redis.createClient({ url: redisUrl });

// Olay dinleyicileri (Loglama için çok faydalıdır)
client.on("error", (err) => logger.error("🔴 Redis Bağlantı Hatası:", err));
client.on("connect", () => logger.info("🟡 Redis: Bağlantı kuruluyor..."));
client.on("ready", () =>
  logger.info("🟢 Redis: Hazır ve şifreli erişim sağlandı!"),
);

(async () => {
  try {
    await client.connect();
  } catch (error) {
    logger.error(
      "Redis'e bağlanılamadı, lütfen podman-compose'u kontrol et.",
      error,
    );
  }
})();

module.exports = client;
