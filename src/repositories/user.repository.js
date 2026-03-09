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
  async createUser(full_name, email, password_hash) {
    const result = await pool.query(
      "INSERT INTO users (full_name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, full_name, email, role",
      [full_name, email.toLowerCase(), password_hash],
    );
    return result.rows[0];
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
      "SELECT id, role FROM users WHERE refresh_token = $1",
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
