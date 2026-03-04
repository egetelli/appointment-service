const express = require("express");
const cors = require("cors");
const router = express.Router();
const authenticate = require("./middleware/auth.middleware");

const authRoutes = require("./routes/auth.routes");
const appointmentRoutes = require("./routes/appointment.routes");
const errorHandler = require("./middleware/error.middleware");

const app = express();
const userRoutes = require("./routes/user.routes");

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);

app.use(express.json());

app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});

app.use("/api/auth", authRoutes);
//app.use("/api/appointments", appointmentRoutes);

app.use("/api", userRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// --- GLOBAL ERROR HANDLER ---
// ÖNEMLİ: Tüm rotalardan SONRA eklenmelidir.
app.use(errorHandler);

module.exports = app;
