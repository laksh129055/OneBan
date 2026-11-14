const Platform = require("../models/Platform");

// The bouncer: checks the API key before letting a request in
async function verifyApiKey(req, res, next) {
  const key = req.header("x-api-key");
  if (!key) return res.status(401).json({ error: "Missing x-api-key header" });

  const platform = await Platform.findOne({ apiKey: key });
  if (!platform) return res.status(403).json({ error: "Invalid API key" });

  req.platform = platform;
  next();
}

module.exports = verifyApiKey;