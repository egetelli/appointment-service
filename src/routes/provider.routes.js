const express = require("express");
const router = express.Router();
const providerController = require("../controllers/provider.controller");
const { protect, authorize } = require("../middlewares/auth.middleware");

/**
 * @desc    Tüm sağlayıcıları listele (Genel kullanım/Randevu formu)
 * @route   GET /api/providers
 */
router.get("/", providerController.getProviders);

/**
 * @desc    Admin Yetkili Rotalar
 * Bu rotalar sadece giriş yapmış ('protect') ve rolü 'admin' olanlar içindir.
 */

// Yeni bir sağlayıcı (çalışan) oluşturma
router.post(
  "/",
  protect,
  authorize("admin"),
  providerController.createProvider,
);

// Bir sağlayıcıya hizmet (servis) atama veya fiyat güncelleme
// Endpoint: POST /api/providers/:id/services
router.post(
  "/:id/services",
  protect,
  authorize("admin"),
  providerController.assignService,
);

// Bir sağlayıcının bilgilerini güncelleme (İhtiyaca göre controller'a metod eklenebilir)
// router.put('/:id', protect, authorize('admin'), providerController.updateProvider);

module.exports = router;
