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
}

module.exports = new AdminController();
