const providerRepository = require("../repositories/provider.repository");

class ProviderService {
  async getAllProviders() {
    return await providerRepository.findAll();
  }

  async getProviderServices(providerId) {
    // İleride buraya "Bu uzmanın hesabı askıya alınmış mı?" gibi
    // iş mantıkları (business logic) eklemek istersek tam yeri burasıdır.
    return await providerRepository.findServicesByProviderId(providerId);
  }

  async createProvider(data) {
    // Eğer bir user_id gelmişse, o kullanıcının zaten bir provider kaydı olup olmadığını kontrol edebilirsin
    return await providerRepository.create(data);
  }

  async updateProvider(id, data) {
    const provider = await providerRepository.findById(id);
    if (!provider) throw new Error("Sağlayıcı bulunamadı.");
    return await providerRepository.update(id, data);
  }

  async assignServiceToProvider(providerId, serviceId, customPrice) {
    // Burada her iki ID'nin de varlığını check edebilirsin
    return await providerRepository.assignService(
      providerId,
      serviceId,
      customPrice,
    );
  }

  async unassignServiceFromProvider(providerId, serviceId) {
    return await providerRepository.removeService(providerId, serviceId);
  }
}

module.exports = new ProviderService();
