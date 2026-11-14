require("dotenv").config();
const crypto = require("crypto");
const mongoose = require("mongoose");
const Platform = require("./models/Platform");

// Makes a long random API key (like a password)
const newKey = (name) => name.toLowerCase() + "_" + crypto.randomBytes(16).toString("hex");

const platforms = [
  { name: "QuickRide", type: "ride-hailing" },
  { name: "HomeFix",   type: "home-services" },
  { name: "FoodDash", type: "food-delivery" },
];

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  for (const p of platforms) {
    const existing = await Platform.findOne({ name: p.name });

    if (existing) {
      // Already on the list → keep the same key
      console.log(`${p.name.padEnd(10)} → ${existing.apiKey}  (kept)`);
    } else {
      // Not on the list yet → create it with a new key
      const apiKey = newKey(p.name);
      await Platform.create({ ...p, apiKey });
      console.log(`${p.name.padEnd(10)} → ${apiKey}  (new)`);
    }
  }

  await mongoose.disconnect();
})();