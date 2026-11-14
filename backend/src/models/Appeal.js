const mongoose = require("mongoose");

// An accused person asks the reporting platforms to review their report(s)
const appealSchema = new mongoose.Schema(
  {
    phoneHash: { type: String },
    idHash: { type: String },
    reason: { type: String, required: true, maxlength: 1000 },
    signals: [{ type: mongoose.Schema.Types.ObjectId, ref: "Signal" }],
    decisions: [
      {
        platform: { type: mongoose.Schema.Types.ObjectId, ref: "Platform" },
        decision: { type: String, enum: ["upheld", "removed"] },
        note: { type: String, maxlength: 500 },
        at: { type: Date, default: Date.now },
      },
    ],
    status: { type: String, enum: ["pending", "resolved"], default: "pending" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Appeal", appealSchema);
