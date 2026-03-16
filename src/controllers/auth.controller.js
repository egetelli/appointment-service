const authService = require("../services/auth.service");
const asyncHandler = require("../middleware/asyncHandler");
const ErrorResponse = require("../utils/errorResponse");

// Yardımcı Fonksiyon: Cookie ayarları (Güvenlik kalkanımız)
const getCookieOptions = () => ({
  expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 Gün
  httpOnly: true, // XSS Koruması
  secure: process.env.NODE_ENV === "production", // Sadece HTTPS
  sameSite: "strict", // CSRF Koruması
});

/**
 * @desc  Register new user
 * @route POST /api/auth/register
 * @access Public
 */
const register = asyncHandler(async (req, res) => {
  const { full_name, email, password, role } = req.body;

  let assignedRole = "customer";
  if (role === "provider") {
    assignedRole = "provider";
  }

  const user = await authService.register(
    full_name,
    email,
    password,
    assignedRole,
  );

  res.status(201).json({
    success: true,
    message: "Kullanıcı başarıyla oluşturuldu.",
    data: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
  });
});

/**
 * @desc  Login user
 * @route POST /api/auth/login
 * @access Public
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Servis artık bize hem accessToken, hem refreshToken hem de user bilgilerini dönmeli
  const { accessToken, refreshToken, user } = await authService.login(
    email,
    password,
  );

  // Refresh token'ı Cookie'ye, Access token'ı JSON (Angular için) içine koyuyoruz
  res
    .status(200)
    .cookie("refreshToken", refreshToken, getCookieOptions())
    .json({
      success: true,
      message: "Giriş başarılı.",
      accessToken, // Angular bunu RAM'de tutacak
      data: user,
    });
});

/**
 * @desc  Refresh JWT token (Cookie tabanlı)
 * @route POST /api/auth/refresh
 * @access Public
 */
const refreshToken = asyncHandler(async (req, res) => {
  // 1. Token'ı body'den değil, tarayıcının otomatik gönderdiği Cookie'den okuyoruz
  const token = req.cookies?.refreshToken;

  if (!token) {
    throw new ErrorResponse(
      "Oturumunuz sonlanmış, lütfen tekrar giriş yapın",
      401,
    );
  }

  // 2. Servise gidip bu token'ı doğrula ve yepyeni jetonlar al (Token Rotation)
  const { accessToken, newRefreshToken } =
    await authService.refreshToken(token);

  // 3. Yeni Refresh Token'ı tekrar Cookie'ye yazıp, Access Token'ı dönüyoruz
  res
    .status(200)
    .cookie("refreshToken", newRefreshToken, getCookieOptions())
    .json({
      success: true,
      message: "Yeni token başarıyla oluşturuldu.",
      accessToken, // Angular'ın yeni giriş anahtarı
    });
});

/**
 * @desc  Logout user
 * @route POST /api/auth/logout
 * @access Public
 */
const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;

  if (token) {
    // Eğer cookie varsa, veritabanından da silinmesi için servise bildiriyoruz
    await authService.logout(token);
  }

  // Tarayıcıdaki Cookie'yi temizle
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  res.status(200).json({
    success: true,
    message: "Başarıyla çıkış yapıldı.",
  });
});

module.exports = {
  register,
  login,
  refreshToken,
  logout,
};
