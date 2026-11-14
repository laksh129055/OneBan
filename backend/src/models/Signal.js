const mongoose = require("mongoose");

// One ban report — only hashes, never the real phone/ID
const signalSchema = new mongoose.Schema(
  {
    phoneHash: { type: String, index: true },
    idHash: { type: String, index: true },
    category: { type: String, required: true },
    severity: { type: String, enum: ["low", "medium", "high"], required: true },
    city: { type: String, default: "Unknown" },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Platform", required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Signal", signalSchema);