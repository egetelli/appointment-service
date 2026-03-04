const express = require("express");
const router = express.Router();
const { getMe } = require("../controllers/user.controller");
const authenticate = require("../middleware/auth.middleware");
const authorize = require("../middleware/authorize");

// Sadece giriş yapmış olanlar
router.get("/me", authenticate, getMe);

// Örnek: Sadece adminlerin görebileceği bir dashboard rotası
router.get("/admin-stats", authenticate, authorize("admin"), (req, res) => {
    res.json({ message: "Sadece adminler burayı görebilir" });
});

module.exports = router;