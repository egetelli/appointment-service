const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const app = express();

// --- 0. PROXY AYARI (KRİTİK!) ---
// Docker/Podman arkasındaki gerçek kullanıcı IP'sini görmeni sağlar.
app.set("trust proxy", 1);

// Rotaları içe aktar
const authRoutes = require("./routes/auth.routes");
const appointmentRoutes = require("./routes/appointment.routes");
const userRoutes = require("./routes/user.routes");
const serviceRoutes = require("./routes/service.routes");
const providerRoutes = require("./routes/provider.routes");
const settingsRoutes = require("./routes/settings.routes");
const adminRoutes = require("./routes/admin.routes");

const errorHandler = require("./middleware/error.middleware");

// Swagger
const swaggerUi = require("swagger-ui-express");
const swaggerSpecs = require("./config/swagger");

// Rate Limiting Middleware
const { apiLimiter, authLimiter } = require("./middleware/limiter.middleware");

// --- 1. Temel Güvenlik ve Parser Middlewares ---
app.use(helmet()); // 🛡️ HTTP başlıklarını güvenli hale getirir
app.use(
  cors({
    origin: "http://localhost:4200", // Angular'ın çalıştığı tam adres (Sonda slash '/' olmamalı!)
    credentials: true, // Frontend'deki 'withCredentials: true' ayarının backend karşılığı (ZORUNLU)
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json());
app.use(cookieParser());

// --- 2. Hız Sınırlayıcılar (Rate Limiters) ---
// Not: Rotalardan ÖNCE tanımlanmalıdır!

// Auth işlemleri için KATİ kural (15 dakikada 10 deneme)
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

// Tüm API için genel kural (15 dakikada 100 istek)
app.use("/api/", apiLimiter);

// --- 3. Dokümantasyon ---
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

// --- 4. Health Check ---
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
});

// --- 5. API Rotaları ---
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/providers", providerRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/admin", adminRoutes); // Admin rotalarını ekle (En sona eklemek iyi olur, diğer rotalardan sonra)

// --- 6. 404 Yakalayıcı ---
app.use((req, res) => {
  res
    .status(404)
    .json({ success: false, message: "İstediğiniz rota bulunamadı" });
});

// --- 7. Global Error Handler (En sonda!) ---
app.use(errorHandler);

module.exports = app;
