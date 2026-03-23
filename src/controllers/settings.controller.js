const settingsService = require("../services/settings.service");

exports.saveSchedule = async (req, res, next) => {
  try {
    const { schedule } = req.body; // Frontend'den gelen 'schedule' sinyali
    const result = await settingsService.updateSchedule(req.user.id, schedule);
    res.status(200).json(result);
  } catch (error) {
    next(error); // Error handler'a gönder
  }
};

exports.saveServices = async (req, res, next) => {
  try {
    const { services } = req.body;
    const result = await settingsService.syncServices(req.user.id, services);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

exports.saveProfile = async (req, res, next) => {
  try {
    const profileData = req.body;
    const result = await settingsService.updateProfile(
      req.user.id,
      profileData,
    );
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

exports.getAllSettings = async (req, res, next) => {
  try {
    const result = await settingsService.getAllSettings(req.user.id);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
