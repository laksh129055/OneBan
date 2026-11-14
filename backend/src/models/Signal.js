const mongoose = require("mongoose");

// Only serious safety offences can be reported — OneBan is not a blacklist for bad service
const CATEGORIES = [
  "sexual_harassment",
  "sexual_assault",
  "stalking",
  "physical_assault",
  "verbal_abuse",
  "threats_intimidation",
  "voyeurism",
];

// One ban report — only hashes, never the real phone/ID
const signalSchema = new mongoose.Schema(
  {
    phoneHash: { type: String, index: true },
    idHash: { type: String, index: true },
    category: { type: String, enum: CATEGORIES, required: true },
    severity: { type: String, enum: ["low", "medium", "high"], required: true },
    city: { type: String, default: "Unknown", trim: true, maxlength: 60 },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Platform", required: true },
    // "removed" = taken down after a successful appeal → no longer matches in /check
    status: { type: String, enum: ["active", "removed"], default: "active", index: true },
  },
  { timestamps: true }
);

const Signal = mongoose.model("Signal", signalSchema);
Signal.CATEGORIES = CATEGORIES;
// Older reports have no status field — treat them as active
Signal.ACTIVE = { status: { $ne: "removed" } };

module.exports = Signal;
