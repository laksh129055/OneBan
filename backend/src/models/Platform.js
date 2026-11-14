const mongoose = require("mongoose");

// One document = one member company (QuickRide, HomeFix, FoodDash)
const platformSchema = new mongoose.Schema({
  name:         { type: String, required: true, unique: true },
  type:         { type: String, required: true },
  apiKey:       { type: String, required: true, unique: true },
  email:        { type: String, unique: true, sparse: true },
  passwordHash: { type: String },
});

module.exports = mongoose.model("Platform", platformSchema);
