const mongoose = require("mongoose");

// One document = one member company (QuickRide, HomeFix, MatchMate)
const platformSchema = new mongoose.Schema({
  name:   { type: String, required: true, unique: true },
  type:   { type: String, required: true },
  apiKey: { type: String, required: true, unique: true },
});

module.exports = mongoose.model("Platform", platformSchema);