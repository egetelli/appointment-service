const serviceRepository = require('../repositories/service.repository');

class ServiceService {
    // Kullanıcılar için sadece aktif servisler
    async getAllActiveServices() {
        return await serviceRepository.findAllActive();
    }

    // Admin paneli için tüm servisler
    async getAllServicesForAdmin() {
        return await serviceRepository.findAll();
    }

    async getServiceById(id) {
        const service = await serviceRepository.findById(id);
        if (!service) throw new Error('Aradığınız servis bulunamadı.');
        return service;
    }

    async createService(data) {
        // İsteğe bağlı: Burada isim benzerliği kontrolü (duplicate check) yapılabilir
        return await serviceRepository.create(data);
    }

    async updateService(id, data) {
        const existing = await serviceRepository.findById(id);
        if (!existing) throw new Error('Güncellenmek istenen servis bulunamadı.');
        
        return await serviceRepository.update(id, data);
    }

    async deleteService(id) {
        const existing = await serviceRepository.findById(id);
        if (!existing) throw new Error('Silinmek istenen servis bulunamadı.');
        
        return await serviceRepository.softDelete(id);
    }

    async getServiceProviders(id) {
        const providers = await serviceRepository.findProvidersByServiceId(id);
        return providers;
    }
}

module.exports = new ServiceService();