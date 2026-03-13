const db = require("../config/db");

class ServiceRepository {
  // 1. Tüm Aktif Servisleri Listele (Kullanıcı Formu İçin)
  async findAllActive() {
    const query =
      "SELECT * FROM services WHERE is_active = true ORDER BY created_at DESC";
    const { rows } = await db.query(query);
    return rows;
  }

  // 2. Tüm Servisleri Listele (Admin Paneli İçin - Pasifler Dahil)
  async findAll() {
    const query = "SELECT * FROM services ORDER BY created_at DESC";
    const { rows } = await db.query(query);
    return rows;
  }

  // 3. Tekil Servis Getir
  async findById(id) {
    const query = "SELECT * FROM services WHERE id = $1";
    const { rows } = await db.query(query, [id]);
    return rows[0];
  }

  // 4. Yeni Servis Oluştur
  async create(serviceData) {
    const { name, description, duration_minutes, base_price } = serviceData;
    const query = `
            INSERT INTO services (name, description, duration_minutes, base_price)
            VALUES ($1, $2, $3, $4)
            RETURNING *;
        `;
    const values = [name, description, duration_minutes, base_price];
    const { rows } = await db.query(query, values);
    return rows[0];
  }

  // 5. Servis Güncelle
  async update(id, serviceData) {
    const { name, description, duration_minutes, base_price, is_active } =
      serviceData;
    const query = `
            UPDATE services 
            SET name = $1, description = $2, duration_minutes = $3, base_price = $4, is_active = $5
            WHERE id = $6
            RETURNING *;
        `;
    const values = [
      name,
      description,
      duration_minutes,
      base_price,
      is_active,
      id,
    ];
    const { rows } = await db.query(query, values);
    return rows[0];
  }

  // 6. Servis Sil (Soft Delete - Güvenli Yöntem)
  async softDelete(id) {
    const query =
      "UPDATE services SET is_active = false WHERE id = $1 RETURNING *;";
    const { rows } = await db.query(query, [id]);
    return rows[0];
  }

  // 7. Randevu Formu İçin: Servise Bağlı Uzmanları Getir
  async findProvidersByServiceId(serviceId) {
    const query = `
            SELECT p.*, u.full_name 
            FROM providers p
            JOIN users u ON p.user_id = u.id
            JOIN provider_services ps ON p.id = ps.provider_id
            WHERE ps.service_id = $1 AND p.is_active = true
        `;
    const { rows } = await db.query(query, [serviceId]);
    return rows;
  }
}

module.exports = new ServiceRepository();
