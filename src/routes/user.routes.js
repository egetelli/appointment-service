const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/auth.middleware");

router.get("/me", authenticate, (req, res) => {
  res.json({
    message: "Korunan route çalışıyor",
    user: req.user,
  });
});

module.exports = router;