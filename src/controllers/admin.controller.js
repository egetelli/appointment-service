const adminService = require("../services/admin.service");

class AdminController {
  async getDashboard(req, res, next) {
    try {
      const dashboardData = await adminService.getDashboardSummary();

      // Angular tarafındaki ApiResponse modeline uygun yanıt
      return res.status(200).json({
        success: true,
        message: "Dashboard verileri başarıyla getirildi.",
        data: dashboardData,
      });
    } catch (error) {
      // Merkezi hata yönetimine (middleware) gönder
      next(error);
    }
  }

  // USER HANDLERS
  async getUsers(req, res, next) {
    try {
      const data = await adminService.getUsers();
      res.status(200).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async createUser(req, res, next) {
    try {
      const data = await adminService.createUser(req.body);
      res
        .status(201)
        .json({ success: true, message: "Kullanıcı oluşturuldu", data });
    } catch (e) {
      next(e);
    }
  }

  async updateUser(req, res, next) {
    try {
      const data = await adminService.updateUser(req.params.id, req.body);
      res.status(200).json({ success: true, message: "Güncellendi", data });
    } catch (e) {
      next(e);
    }
  }

  async deleteUser(req, res, next) {
    try {
      await adminService.deleteUser(req.params.id);
      res.status(200).json({ success: true, message: "Silindi" });
    } catch (e) {
      next(e);
    }
  }

  // SERVICE HANDLERS
  async getProviderServices(req, res, next) {
    try {
      const data = await adminService.getProviderServices(req.params.id);
      res.status(200).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async createOrUpdateService(req, res, next) {
    try {
      const { id: providerId, serviceId } = req.params;
      const data = await adminService.manageService(
        serviceId,
        req.body,
        providerId,
      );
      res.status(200).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async deleteService(req, res, next) {
    try {
      await adminService.deleteService(req.params.serviceId);
      res.status(200).json({ success: true, message: "Hizmet silindi" });
    } catch (e) {
      next(e);
    }
  }

  // WORKING HOURS HANDLERS
  async getWorkingHours(req, res, next) {
    try {
      const data = await adminService.getWorkingHours(req.params.id);
      res.status(200).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async updateWorkingHours(req, res, next) {
    try {
      await adminService.updateWorkingHours(req.params.id, req.body);
      res.status(200).json({ success: true, message: "Saatler güncellendi" });
    } catch (e) {
      next(e);
    }
  }
}

module.exports = new AdminController();
