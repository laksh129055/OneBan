const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Platform = require("../models/Platform");

// POST /auth/login → returns a token valid for 8 hours
router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  const platform = email ? await Platform.findOne({ email: String(email) }) : null;

  const ok = platform && platform.passwordHash &&
             (await bcrypt.compare(String(password || ""), platform.passwordHash));
  if (!ok) return res.status(401).json({ error: "Wrong email or password" });

  const token = jwt.sign({ id: platform._id }, process.env.JWT_SECRET, { expiresIn: "8h" });
  res.json({ token, platform: { name: platform.name, type: platform.type } });
});

module.exports = router;
