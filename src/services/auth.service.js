const pool = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto"); // Refresh Token üretmek için eklendi
const ErrorResponse = require("../utils/errorResponse");

/**
 * Yeni kullanıcı kaydı
 */
async function register(full_name, email, password) {
  const userExists = await pool.query("SELECT id FROM users WHERE email = $1", [
    email,
  ]);

  if (userExists.rows.length > 0) {
    throw new ErrorResponse("Bu email adresi zaten kayıtlı.", 400);
  }

  const saltRounds = 12;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  const result = await pool.query(
    "INSERT INTO users (full_name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, full_name, email, role",
    [full_name, email.toLowerCase(), hashedPassword],
  );

  return result.rows[0];
}

/**
 * Kullanıcı Girişi (Çift Token Üretimi)
 */
async function login(email, password) {
  const result = await pool.query(
    "SELECT id, full_name, email, password_hash, role FROM users WHERE email = $1",
    [email.toLowerCase()],
  );

  const user = result.rows[0];

  if (!user) throw new ErrorResponse("Geçersiz e-posta veya şifre", 401);

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw new ErrorResponse("Geçersiz e-posta veya şifre", 401);

  // 1. Access Token (15 Dakikalık kısa ömür)
  const accessToken = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }, // Güvenlik gereği süreyi çok kısalttık
  );

  // 2. Refresh Token (Şifrelenmiş rastgele metin)
  const refreshToken = crypto.randomBytes(40).toString("hex");

  // 3. Refresh Token'ı veritabanına kaydet
  await pool.query("UPDATE users SET refresh_token = $1 WHERE id = $2", [
    refreshToken,
    user.id,
  ]);

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
    },
  };
}

/**
 * Yeni Token Alma (Token Rotation)
 */
async function refreshToken(oldToken) {
  // 1. Bu token kime ait bul
  const result = await pool.query(
    "SELECT id, role FROM users WHERE refresh_token = $1",
    [oldToken],
  );

  const user = result.rows[0];
  if (!user)
    throw new ErrorResponse("Geçersiz oturum, tekrar giriş yapın", 401);

  // 2. Yepyeni bir Access Token üret
  const accessToken = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "15m" },
  );

  // 3. Güvenlik için Refresh Token'ı da yenile (Rotation)
  const newRefreshToken = crypto.randomBytes(40).toString("hex");
  await pool.query("UPDATE users SET refresh_token = $1 WHERE id = $2", [
    newRefreshToken,
    user.id,
  ]);

  return { accessToken, newRefreshToken };
}

/**
 * Çıkış Yapma (Veritabanından token'ı sil)
 */
async function logout(token) {
  await pool.query(
    "UPDATE users SET refresh_token = NULL WHERE refresh_token = $1",
    [token],
  );
}

module.exports = { register, login, refreshToken, logout };
