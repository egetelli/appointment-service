const providerService = require('../services/provider.service');
const logger = require('../utils/logger');

class ProviderController {
    async getProviders(req, res) {
        try {
            const data = await providerService.getAllProviders();
            res.json({ success: true, data });
        } catch (error) {
            logger.error('ProviderController - getProviders: %o', error);
            res.status(500).json({ success: false, message: 'Veriler getirilemedi.' });
        }
    }

    async createProvider(req, res) {
        try {
            const data = await providerService.createProvider(req.body);
            res.status(201).json({ success: true, data });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    // Hizmet Atama Endpoint'i
    async assignService(req, res) {
        try {
            const { service_id, custom_price } = req.body;
            const data = await providerService.assignServiceToProvider(req.params.id, service_id, custom_price);
            res.json({ success: true, data, message: 'Hizmet başarıyla atandı.' });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
}

module.exports = new ProviderController();