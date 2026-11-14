const router = require("express").Router();
const Signal = require("../models/Signal");
const { hashIdentity } = require("../utils/hash");

// POST /check — a platform checks a new sign-up
router.post("/", async (req, res) => {
  try {
    const { phone, idToken } = req.body;
    if (!phone && !idToken) return res.status(400).json({ error: "phone or idToken is required" });

    // Make the same fingerprints as /signal did
    const { phoneHash, idHash } = hashIdentity({ phone, idToken });

    // Search for a match on phone OR ID
    const or = [];
    if (phoneHash) or.push({ phoneHash });
    if (idHash) or.push({ idHash });

    const signals = await Signal.find({ $or: or }).populate("reportedBy", "name type");

    // Send back only safe summary info — no hashes, no identity
    const incidents = signals.map((s) => ({
      category: s.category,
      severity: s.severity,
      reportedBy: s.reportedBy?.name,
      date: s.createdAt.toISOString().slice(0, 10),
    }));

    res.json({ match: incidents.length > 0, incidents });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;