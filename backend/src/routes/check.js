const router = require("express").Router();
const Signal = require("../models/Signal");
const { hashIdentity } = require("../utils/hash");
const { audit } = require("../utils/audit");

// POST /check — a platform checks a new sign-up against the network
router.post("/", async (req, res) => {
  const { phone, idToken } = req.body || {};
  if (!phone && !idToken) return res.status(400).json({ error: "phone or idToken is required" });

  // Make the same fingerprints as /signal did
  const { phoneHash, idHash } = hashIdentity({ phone, idToken });

  // Match on phone OR ID (changing SIM doesn't help). Removed reports are ignored.
  const or = [];
  if (phoneHash) or.push({ phoneHash });
  if (idHash) or.push({ idHash });

  const signals = await Signal.find({ $or: or, ...Signal.ACTIVE })
    .sort({ createdAt: -1 })
    .populate("reportedBy", "name type");

  // Send back only safe summary info — no hashes, no identity
  const incidents = signals.map((s) => ({
    category: s.category,
    severity: s.severity,
    reportedBy: s.reportedBy?.name,
    date: s.createdAt.toISOString().slice(0, 10),
  }));

  await audit(req, { action: "check", matched: incidents.length > 0, phoneHash, idHash });

  res.json({
    match: incidents.length > 0,
    incidents,
    advice: incidents.length
      ? "Match found. Send this applicant for human review before approving."
      : "No signals found.",
  });
});

module.exports = router;
