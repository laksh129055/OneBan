const router = require("express").Router();
const Signal = require("../models/Signal");
const { hashIdentity } = require("../utils/hash");
const { audit } = require("../utils/audit");

// POST /signal — a platform reports a banned offender (after a verified complaint)
router.post("/", async (req, res) => {
  const { phone, idToken, category, severity, city } = req.body || {};
  if (!phone && !idToken) return res.status(400).json({ error: "phone or idToken is required" });

  const { phoneHash, idHash } = hashIdentity({ phone, idToken }); // hash first!

  let signal;
  try {
    signal = await Signal.create({
      phoneHash, idHash, category, severity, city,
      reportedBy: req.platform._id,
    });
  } catch (err) {
    if (err.name === "ValidationError") {
      const allowed = Signal.CATEGORIES.join(", ");
      return res.status(400).json({ error: `Invalid report. Category must be one of: ${allowed}. Severity must be low, medium or high.` });
    }
    throw err;
  }

  await audit(req, { action: "signal", phoneHash, idHash });
  res.status(201).json({ status: "recorded", signalId: signal._id });
});

// GET /signal/mine — this platform's own reports (for the "My reports" page)
router.get("/mine", async (req, res) => {
  const signals = await Signal.find({ reportedBy: req.platform._id }).sort({ createdAt: -1 });
  res.json(
    signals.map((s) => ({
      id: s._id,
      category: s.category,
      severity: s.severity,
      city: s.city,
      status: s.status || "active",
      date: s.createdAt,
    }))
  );
});

// GET /signal/categories — the allowed categories (handy for the portal dropdown)
router.get("/categories", (req, res) => res.json(Signal.CATEGORIES));

module.exports = router;
