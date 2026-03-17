const { Server } = require("socket.io");
const logger = require('../utils/logger');

let io;

module.exports = {
  init: (httpServer) => {
    io = new Server(httpServer, {
      cors: {
        origin: "http://localhost:4200", // Frontend adresin
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    io.on("connection", (socket) => {
      logger.info("⚡ Yeni bir kullanıcı bağlandı:", socket.id);

      // Kullanıcıyı kendi ID'sine özel bir odaya (room) alalım
      // Böylece sadece o kullanıcıya özel mesaj atabiliriz.
      socket.on("join_room", (userId) => {
        socket.join(userId);
        logger.info(`👤 Kullanıcı ${userId} kendi odasına katıldı.`);
      });

      socket.on("disconnect", () => {
        logger.info("❌ Kullanıcı ayrıldı.");
      });
    });

    return io;
  },
  getIO: () => {
    if (!io) {
      throw new Error("Socket.io başlatılmadı!");
    }
    return io;
  },
};
