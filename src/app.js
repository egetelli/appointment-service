const express = require("express");
const cors = require("cors");
const app = express(); 

// Rotaları içe aktar
const authRoutes = require("./routes/auth.routes");
const appointmentRoutes = require("./routes/appointment.routes");
const userRoutes = require("./routes/user.routes");
const errorHandler = require("./middleware/error.middleware");

// 1. Orta Katmanlar (Middlewares)
app.use(
  cors({
    origin: "http://localhost:5173", // Angular/Vite adresin
    credentials: true,
  })
);
app.use(express.json());

// 2. Health Check (AWS/Kubernetes için kritik)
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
});

// 3. API Rotaları (Gruplandırılmış ve Tutarlı)
app.use("/api/auth", authRoutes);         // /api/auth/register, /api/auth/login
app.use("/api/users", userRoutes);       // /api/users/me (Daha profesyonel)
app.use("/api/appointments", appointmentRoutes); // /api/appointments

// 4. Tanımsız Rotaları Yakala (404)
app.use((req, res) => {
  res.status(404).json({ success: false, message: "İstediğiniz rota bulunamadı" });
});

// 5. GLOBAL ERROR HANDLER (En sonda kalmalı)
app.use(errorHandler);

module.exports = app;