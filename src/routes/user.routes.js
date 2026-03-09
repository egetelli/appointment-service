const express = require("express");
const router = express.Router();
const { getMe } = require("../controllers/user.controller");
const authenticate = require("../middleware/auth.middleware");
const authorize = require("../middleware/authorize");

/**
 * @swagger
 * tags:
 *   - name: Users
 *     description: Kullanıcı profil işlemleri
 */

/**
 * @swagger
 * /api/users/me:
 *   get:
 *     summary: Giriş yapmış kullanıcının bilgilerini getirir
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Kullanıcı profil verisi başarıyla getirildi
 */
router.get("/me", authenticate, getMe);

/**
 * @swagger
 * /api/users/admin-stats:
 *   get:
 *     summary: Admin panel istatistiklerini getirir
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: İstatistikler başarıyla getirildi
 *       403:
 *         description: Yetkisiz erişim (Sadece Admin)
 */
router.get("/admin-stats", authenticate, authorize("admin"), (req, res) => {
  res.json({ message: "Sadece adminler burayı görebilir" });
});

module.exports = router;
