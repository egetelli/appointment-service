const asyncHandler = require("../middleware/asyncHandler");

exports.getMe = asyncHandler(async (req, res, next) => {
  res.status(200).json({
    success: true,
    message: "Kullanıcı profili başarıyla getirildi",
    user: req.user
  });
});