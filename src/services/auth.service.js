const userRepository = require("../repositories/user.repository");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const ErrorResponse = require("../utils/errorResponse");

/**
 * Kayıt Mantığı
 */
async function register(full_name, email, password) {
  const userExists = await userRepository.findByEmail(email);

  if (userExists) {
    throw new ErrorResponse("Bu email adresi zaten kayıtlı.", 400);
  }

  const saltRounds = 12;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  return await userRepository.createUser(full_name, email, hashedPassword);
}

/**
 * Giriş Mantığı
 */
async function login(email, password) {
  const user = await userRepository.findByEmail(email);

  if (!user) throw new ErrorResponse("Geçersiz e-posta veya şifre", 401);

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw new ErrorResponse("Geçersiz e-posta veya şifre", 401);

  // Token Üretimi
  const accessToken = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "15m" },
  );

  const refreshToken = crypto.randomBytes(40).toString("hex");

  // DB İşlemi Repository üzerinden
  await userRepository.updateRefreshToken(user.id, refreshToken);

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
 * Token Yenileme Mantığı
 */
async function refreshToken(oldToken) {
  const user = await userRepository.findByRefreshToken(oldToken);

  if (!user) {
    throw new ErrorResponse("Geçersiz oturum, tekrar giriş yapın", 401);
  }

  const accessToken = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "15m" },
  );

  const newRefreshToken = crypto.randomBytes(40).toString("hex");

  // Rotation: Eski token yerine yenisini yaz
  await userRepository.updateRefreshToken(user.id, newRefreshToken);

  return { accessToken, newRefreshToken };
}

/**
 * Çıkış Mantığı
 */
async function logout(token) {
  await userRepository.clearRefreshToken(token);
}

module.exports = { register, login, refreshToken, logout };
