const router = require("express").Router();
const Signal = require("../models/Signal");
const { hashIdentity } = require("../utils/hash");

// POST /signal — a platform reports a banned offender
router.post("/", async (req, res) => {
  try {
    const { phone, idToken, category, severity, city } = req.body;
    if (!phone && !idToken) return res.status(400).json({ error: "phone or idToken is required" });

    const { phoneHash, idHash } = hashIdentity({ phone, idToken }); // hash first!

    const signal = await Signal.create({
      phoneHash, idHash, category, severity, city,
      reportedBy: req.platform._id,
    });

    res.status(201).json({ status: "recorded", signalId: signal._id });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;