require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const verifyApiKey = require("./middleware/apiKey");
const authPlatform = require("./middleware/auth");
const { rateLimit, byPlatform, byIp } = require("./middleware/rateLimit");

// Refuse to start without the secrets — avoids silently broken hashing/logins
for (const name of ["MONGO_URI", "HMAC_SECRET", "JWT_SECRET"]) {
  if (!process.env[name]) {
    console.error(`${name} is missing in .env`);
    process.exit(1);
  }
}

const MINUTE = 60 * 1000;
const app = express();
app.set("trust proxy", 1); // Render sits behind a proxy — needed for correct client IPs
app.use(cors());
app.use(express.json({ limit: "10kb" })); // reject oversized bodies

// Open to everyone
app.get("/", (req, res) => res.json({ status: "API running" }));

// Test route — only with a valid API key
app.get("/whoami", verifyApiKey, (req, res) => {
  res.json({ message: "Key accepted", platform: req.platform.name });
});

// Portal login — max 20 attempts per 15 min per IP (stops password guessing)
app.use(
  "/auth",
  rateLimit({ windowMs: 15 * MINUTE, max: 20, keyFn: byIp, message: "Too many login attempts. Try again later." }),
  require("./routes/auth")
);

// Main features — API key OR portal login, each platform rate-limited
app.use("/signal", authPlatform, rateLimit({ windowMs: MINUTE, max: 30, keyFn: byPlatform }), require("./routes/signal"));
app.use("/check", authPlatform, rateLimit({ windowMs: MINUTE, max: 60, keyFn: byPlatform }), require("./routes/check"));
app.use("/stats", authPlatform, require("./routes/stats"));
app.use("/appeals", require("./routes/appeals")); // POST is public; review routes need login

// Unknown routes
app.use((req, res) => res.status(404).json({ error: "Not found" }));

// Errors — never leak internal details to the caller
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") return res.status(400).json({ error: "Invalid JSON body" });
  if (err.type === "entity.too.large") return res.status(413).json({ error: "Request too large" });
  console.error(err);
  res.status(500).json({ error: "Server error" });
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(process.env.PORT || 5000, () => console.log(`API on http://localhost:${process.env.PORT || 5000}`));
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });

module.exports = app;
