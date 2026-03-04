const ErrorResponse = require("../utils/errorResponse");

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new ErrorResponse("Unauthorized", 403));
    }
    next();
  };
};

module.exports = authorize;