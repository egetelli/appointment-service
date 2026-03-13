const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/service.controller');
const { protect, authorize } = require('../middlewares/auth.middleware'); // Daha önce yazdığımız auth koruması

// Herkesin görebileceği rotalar
router.get('/', serviceController.getActiveServices);

// Sadece Admin'in yönetebileceği rotalar
router.post('/', protect, authorize('admin'), serviceController.createService);
router.put('/:id', protect, authorize('admin'), serviceController.updateService);
router.delete('/:id', protect, authorize('admin'), serviceController.deleteService);

module.exports = router;