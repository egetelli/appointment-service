const pool = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const ErrorResponse = require("../utils/errorResponse"); // Yeni sınıfımızı ekledik

/**
 * Yeni kullanıcı kaydı
 */
async function register(full_name, email, password) {
  // 1. Parametre eklendi
  // Önce bu email zaten var mı kontrol et
  const userExists = await pool.query("SELECT id FROM users WHERE email = $1", [
    email,
  ]);

  if (userExists.rows.length > 0) {
    // Hata fırlat (400 Bad Request)
    throw new ErrorResponse("Bu email adresi zaten kayıtlı.", 400);
  }

  // Şifre hashleme
  const saltRounds = 12;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // Veritabanına kayıt (full_name eklendi)
  const result = await pool.query(
    "INSERT INTO users (full_name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, full_name, email, role",
    [full_name, email.toLowerCase(), hashedPassword],
  );

  return result.rows[0];
}

/**
 * Kullanıcı Girişi
 */
async function login(email, password) {
  const result = await pool.query(
    "SELECT id, email, password_hash, role FROM users WHERE email = $1",
    [email.toLowerCase()],
  );

  const user = result.rows[0];

  // Hata fırlat (401 Unauthorized)
  if (!user) throw new ErrorResponse("Invalid email or password", 401);

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw new ErrorResponse("Invalid email or password", 401);

  // JWT Oluşturma
  const token = jwt.sign(
    {
      userId: user.id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "8h" },
  );

  return {
    token,
    user: { id: user.id, email: user.email, role: user.role },
  };
}

module.exports = { register, login };
