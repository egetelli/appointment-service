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

  // Not: Silinen hizmetleri tespit etmek için gelen listede olmayanları silebilirsin.
  // Şimdilik basitçe upsert yapıyoruz:
  for (const service of services) {
    await settingsRepo.upsertService(provider.id, service);
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
