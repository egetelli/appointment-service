const db = require('../config/db');

class ProviderRepository {
    // Tüm sağlayıcıları getir (İlgili kullanıcı bilgileriyle birlikte)
    async findAll() {
        const query = `
            SELECT p.*, u.email, u.role 
            FROM providers p
            LEFT JOIN users u ON p.user_id = u.id
            ORDER BY p.created_at DESC;
        `;
        const { rows } = await db.query(query);
        return rows;
    }

    async findById(id) {
        const query = 'SELECT * FROM providers WHERE id = $1';
        const { rows } = await db.query(query, [id]);
        return rows[0];
    }

    async create(data) {
        const { user_id, name, title } = data;
        const query = `
            INSERT INTO providers (user_id, name, title)
            VALUES ($1, $2, $3)
            RETURNING *;
        `;
        const { rows } = await db.query(query, [user_id, name, title]);
        return rows[0];
    }

    async update(id, data) {
        const { name, title } = data;
        const query = `
            UPDATE providers SET name = $1, title = $2
            WHERE id = $3 RETURNING *;
        `;
        const { rows } = await db.query(query, [name, title, id]);
        return rows[0];
    }

    // --- Provider-Service İlişkisi (Many-to-Many Yönetimi) ---

    async assignService(providerId, serviceId, customPrice) {
        const query = `
            INSERT INTO provider_services (provider_id, service_id, custom_price)
            VALUES ($1, $2, $3)
            ON CONFLICT (provider_id, service_id) 
            DO UPDATE SET custom_price = EXCLUDED.custom_price
            RETURNING *;
        `;
        const { rows } = await db.query(query, [providerId, serviceId, customPrice]);
        return rows[0];
    }

    async removeService(providerId, serviceId) {
        const query = 'DELETE FROM provider_services WHERE provider_id = $1 AND service_id = $2';
        await db.query(query, [providerId, serviceId]);
    }
}

module.exports = new ProviderRepository();