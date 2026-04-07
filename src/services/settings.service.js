const settingsRepo = require("../repositories/settings.repository");

exports.updateSchedule = async (userId, schedule) => {
  const provider = await settingsRepo.getProviderByUserId(userId);
  if (!provider) throw new Error("Uzman profili bulunamadı.");

  // Mevcut saatleri temizle ve yenilerini ekle (En güvenli "sync" yöntemi)
  await settingsRepo.deleteAllWorkingHours(provider.id);

  for (const day of schedule) {
    await settingsRepo.insertWorkingHour(provider.id, day);
  }
  return { success: true };
};

exports.syncServices = async (userId, services) => {
  const provider = await settingsRepo.getProviderByUserId(userId);

  // Gelen listedeki her hizmeti (yeni veya eski) işle
  for (const service of services) {
    await settingsRepo.saveService(provider.id, service);
  }

  return { success: true };
};

exports.updateProfile = async (userId, profileData) => {
  await settingsRepo.updateProviderProfile(userId, profileData);
  return { success: true };
};

exports.getAllSettings = async (userId) => {
  const provider = await settingsRepo.getProviderByUserId(userId);
  if (!provider) throw new Error("Uzman bulunamadı.");

  const [schedule, services, profile] = await Promise.all([
    settingsRepo.getWorkingHours(provider.id),
    settingsRepo.getServices(provider.id),
    settingsRepo.getProviderProfile(userId),
  ]);

  return { schedule, services, profile };
};

exports.deleteService = async (userId, serviceId) => {
  const provider = await settingsRepo.getProviderByUserId(userId);
  if (!provider) throw new Error("Uzman bulunamadı.");

  // Repository'deki silme metodunu çağırıyoruz
  await settingsRepo.deleteService(serviceId, provider.id);
  return { success: true, message: "Hizmet başarıyla silindi." };
};
