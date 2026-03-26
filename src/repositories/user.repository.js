const pool = require("../config/db");

class UserRepository {
  // Email'e göre kullanıcı bul
  async findByEmail(email) {
    const result = await pool.query(
      "SELECT id, full_name, email, password_hash, role FROM users WHERE email = $1",
      [email.toLowerCase()],
    );
    return result.rows[0];
  }

  // Yeni kullanıcı oluştur
  async createUser(full_name, email, password_hash, role) {
    // Transaction başlatmak için pool'dan özel bir istemci (client) alıyoruz
    const client = await pool.connect();

    try {
      await client.query("BEGIN"); // Transaction Başlat

      // 1. Kullanıcıyı ana 'users' tablosuna ekle
      const userResult = await client.query(
        "INSERT INTO users (full_name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, full_name, email, role",
        [full_name, email.toLowerCase(), password_hash, role],
      );

      const newUser = userResult.rows[0];

      // 2. Eğer kayıt olan kişi 'provider' ise, uzman profilini şemana uygun oluştur
      if (role === "provider") {
        await client.query(
          // 'bio' kaldırıldı. 'name' eklendi ve full_name ile dolduruldu.
          "INSERT INTO providers (user_id, name, title) VALUES ($1, $2, $3)",
          [newUser.id, full_name, "Uzman"],
        );
      }

      await client.query("COMMIT"); // Her şey yolundaysa kalıcı olarak kaydet
      return newUser;
    } catch (error) {
      await client.query("ROLLBACK"); // Hata çıkarsa işlemi iptal et (Geri al)
      throw error;
    } finally {
      client.release(); // Bağlantıyı havuza geri bırak
    }
  }

  // Refresh Token'ı güncelle (Login ve Refresh sırasında kullanılır)
  async updateRefreshToken(userId, refreshToken) {
    await pool.query("UPDATE users SET refresh_token = $1 WHERE id = $2", [
      refreshToken,
      userId,
    ]);
  }

  // Refresh Token'a göre kullanıcı bul (Refresh sırasında kullanılır)
  async findByRefreshToken(token) {
    const result = await pool.query(
      "SELECT id, role, full_name, email FROM users WHERE refresh_token = $1",
      [token],
    );
    return result.rows[0];
  }

  // Refresh Token'ı temizle (Logout sırasında kullanılır)
  async clearRefreshToken(token) {
    await pool.query(
      "UPDATE users SET refresh_token = NULL WHERE refresh_token = $1",
      [token],
    );
  }
}

module.exports = new UserRepository();
