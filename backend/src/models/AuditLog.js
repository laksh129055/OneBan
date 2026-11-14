const mongoose = require("mongoose");

// Every check / report / appeal decision is recorded → misuse can be traced to a platform
const auditSchema = new mongoose.Schema({
  platform: { type: mongoose.Schema.Types.ObjectId, ref: "Platform", index: true },
  action: { type: String, enum: ["check", "signal", "appeal_decision"], required: true },
  via: { type: String, enum: ["apiKey", "portal"] },
  matched: { type: Boolean },
  phoneHash: { type: String }, // hashes only — never real numbers
  idHash: { type: String },
  ip: { type: String },
  at: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 180 }, // auto-deleted after 180 days
});

module.exports = mongoose.model("AuditLog", auditSchema);
