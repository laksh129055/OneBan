const mongoose = require("mongoose");
const router = require("express").Router();
const Appeal = require("../models/Appeal");
const Signal = require("../models/Signal");
const authPlatform = require("../middleware/auth");
const { rateLimit, byIp } = require("../middleware/rateLimit");
const { hashIdentity } = require("../utils/hash");
const { audit } = require("../utils/audit");

// POST /appeals — PUBLIC: an accused person asks for their report(s) to be reviewed.
// Always gives the same reply, so it can't be used to find out WHO has been reported.
router.post(
  "/",
  rateLimit({ windowMs: 60 * 60 * 1000, max: 5, keyFn: byIp, message: "Too many appeals. Try again later." }),
  async (req, res) => {
    const { phone, idToken, reason } = req.body || {};
    const text = String(reason || "").trim();
    if ((!phone && !idToken) || text.length < 10) {
      return res.status(400).json({ error: "phone or idToken, and a reason (at least 10 characters), are required" });
    }

    const { phoneHash, idHash } = hashIdentity({ phone, idToken });
    const or = [];
    if (phoneHash) or.push({ phoneHash });
    if (idHash) or.push({ idHash });

    const signals = await Signal.find({ $or: or, ...Signal.ACTIVE }).select("_id");
    if (signals.length) {
      await Appeal.create({ phoneHash, idHash, reason: text.slice(0, 1000), signals: signals.map((s) => s._id) });
    }

    res.status(202).json({
      status: "received",
      message: "If any reports match these details, the platforms that filed them will review your appeal.",
    });
  }
);

// GET /appeals — a platform sees appeals against ITS OWN reports
router.get("/", authPlatform, async (req, res) => {
  const me = String(req.platform._id);
  const myIds = (await Signal.find({ reportedBy: req.platform._id }).select("_id")).map((s) => s._id);
  const appeals = await Appeal.find({ signals: { $in: myIds } }).sort({ createdAt: -1 }).populate("signals");

  res.json(
    appeals.map((a) => {
      const mine = a.signals.filter((s) => String(s.reportedBy) === me);
      const myDecision = a.decisions.find((d) => String(d.platform) === me);
      return {
        id: a._id,
        reason: a.reason,
        date: a.createdAt,
        myDecision: myDecision ? myDecision.decision : "pending",
        reports: mine.map((s) => ({
          id: s._id, category: s.category, severity: s.severity, city: s.city,
          status: s.status || "active", date: s.createdAt,
        })),
      };
    })
  );
});

// POST /appeals/:id/decision — the reporting platform upholds or removes its report(s)
router.post("/:id/decision", authPlatform, async (req, res) => {
  const { decision, note } = req.body || {};
  if (!["upheld", "removed"].includes(decision)) {
    return res.status(400).json({ error: 'decision must be "upheld" or "removed"' });
  }
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "Appeal not found" });

  const appeal = await Appeal.findById(req.params.id).populate("signals");
  const me = String(req.platform._id);
  const mine = appeal ? appeal.signals.filter((s) => String(s.reportedBy) === me) : [];
  if (!appeal || !mine.length) return res.status(404).json({ error: "Appeal not found" });

  if (appeal.decisions.some((d) => String(d.platform) === me)) {
    return res.status(409).json({ error: "You have already decided this appeal" });
  }

  if (decision === "removed") {
    await Signal.updateMany({ _id: { $in: mine.map((s) => s._id) } }, { status: "removed" });
  }

  appeal.decisions.push({ platform: req.platform._id, decision, note: String(note || "").slice(0, 500) });
  const platformsInvolved = new Set(appeal.signals.map((s) => String(s.reportedBy)));
  if (appeal.decisions.length >= platformsInvolved.size) appeal.status = "resolved";
  await appeal.save();

  await audit(req, { action: "appeal_decision" });
  res.json({ status: appeal.status, decision });
});

module.exports = router;
