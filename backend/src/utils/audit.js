const AuditLog = require("../models/AuditLog");

// Record who did what. A logging failure must never break the actual request.
async function audit(req, fields) {
  try {
    await AuditLog.create({
      platform: req.platform?._id,
      via: req.authMethod,
      ip: req.ip,
      ...fields,
    });
  } catch (err) {
    console.error("Audit log failed:", err.message);
  }
}

module.exports = { audit };
