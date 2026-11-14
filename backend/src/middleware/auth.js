const jwt = require("jsonwebtoken");
const Platform = require("../models/Platform");

// Lets in EITHER an API key (big platforms) OR a login token (portal)
async function authPlatform(req, res, next) {
  try {
    const apiKey = req.header("x-api-key");
    const auth = req.header("authorization");
    let platform = null;

    if (apiKey) {
      platform = await Platform.findOne({ apiKey });            // big platforms
      req.authMethod = "apiKey";
    } else if (auth && auth.startsWith("Bearer ")) {
      const { id } = jwt.verify(auth.slice(7), process.env.JWT_SECRET); // portal
      platform = await Platform.findById(id);
      req.authMethod = "portal";
    }

    if (!platform) return res.status(401).json({ error: "Unauthorized" });
    req.platform = platform;
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
}

module.exports = authPlatform;
