const router = require("express").Router();
const Signal = require("../models/Signal");
const AuditLog = require("../models/AuditLog");

// GET /stats — network-wide numbers for the dashboard. Zero personal data.
router.get("/", async (req, res) => {
  const active = { $match: Signal.ACTIVE };
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [total, byCategory, byPlatform, byCity, recent, checks24h, matches24h] = await Promise.all([
    Signal.countDocuments(Signal.ACTIVE),
    Signal.aggregate([active, { $group: { _id: "$category", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    Signal.aggregate([
      active,
      { $group: { _id: "$reportedBy", count: { $sum: 1 } } },
      { $lookup: { from: "platforms", localField: "_id", foreignField: "_id", as: "p" } },
      { $project: { _id: { $arrayElemAt: ["$p.name", 0] }, count: 1 } },
      { $sort: { count: -1 } },
    ]),
    Signal.aggregate([active, { $group: { _id: "$city", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    Signal.find(Signal.ACTIVE).sort({ createdAt: -1 }).limit(8).populate("reportedBy", "name"),
    AuditLog.countDocuments({ action: "check", at: { $gte: dayAgo } }),
    AuditLog.countDocuments({ action: "check", matched: true, at: { $gte: dayAgo } }),
  ]);

  res.json({
    total,
    checks24h,
    matches24h,
    personalDataStored: 0,
    byCategory,
    byPlatform,
    byCity,
    recent: recent.map((s) => ({
      category: s.category,
      severity: s.severity,
      city: s.city,
      reportedBy: s.reportedBy?.name,
      time: s.createdAt,
    })),
  });
});

module.exports = router;
