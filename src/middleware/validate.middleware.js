const { validationResult } = require("express-validator");
const ErrorResponse = require("../utils/errorResponse");

/**
 * Gelen doğrulama hatalarını yakalayıp Global Error Handler'a fırlatır
 */
const validate = (req, res, next) => {
    const errors = validationResult(req);

    //Eğer hata varsa (örneğin e-posta geçersizse veya şifre kısaysa)
    if (!errors.isEmpty()){
        //Hataları virgülle ayırarak tek bir mesaj haline getirir
        const extractedErrors = errors.array().map(err => err.msg).join(', ');

        //400 Bad Request koduyla sistemimizin standart hata fırlatıcısına gönderir
        return next(new ErrorResponse(`Doğrulama Hatası: ${extractedErrors}`, 400));
    }

    //Hata yoksa constroller'a geçişe izin ver
    next();
}

module.exports = validate;