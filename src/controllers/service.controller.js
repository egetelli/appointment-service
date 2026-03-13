const serviceService = require("../services/service.service");
const logger = require("../utils/logger"); // Winston logger

class ServiceController {
  // @route   GET /api/services
  // @desc    Get all active services
  async getActiveServices(req, res) {
    try {
      const data = await serviceService.getAllActiveServices();
      res.json({ success: true, data });
    } catch (error) {
      logger.error("ServiceController - getActiveServices: %o", error);
      res
        .status(500)
        .json({
          success: false,
          message: "Servisler getirilirken bir hata oluştu.",
        });
    }
  }

  // @route   POST /api/services (ADMIN ONLY)
  async createService(req, res) {
    try {
      const data = await serviceService.createService(req.body);
      logger.info(`Yeni servis oluşturuldu: ${data.name}`);
      res
        .status(201)
        .json({
          success: true,
          data,
          message: "Servis başarıyla oluşturuldu.",
        });
    } catch (error) {
      logger.error("ServiceController - createService: %o", error);
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // @route   PUT /api/services/:id (ADMIN ONLY)
  async updateService(req, res) {
    try {
      const data = await serviceService.updateService(req.params.id, req.body);
      res.json({
        success: true,
        data,
        message: "Servis başarıyla güncellendi.",
      });
    } catch (error) {
      logger.error("ServiceController - updateService: %o", error);
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // @route   DELETE /api/services/:id (ADMIN ONLY)
  async deleteService(req, res) {
    try {
      await serviceService.deleteService(req.params.id);
      res.json({ success: true, message: "Servis pasife çekildi." });
    } catch (error) {
      logger.error("ServiceController - deleteService: %o", error);
      res.status(400).json({ success: false, message: error.message });
    }
  }
}

module.exports = new ServiceController();
