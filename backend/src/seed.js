// npm run seed         → create platforms / add logins (keeps existing API keys)
// npm run rotate-keys  → give every platform a NEW API key
require("dotenv").config();
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const Platform = require("./models/Platform");

const ROTATE = process.argv.includes("--rotate");
const DEMO_PASSWORD = "demo123";
const newKey = (name) => name.toLowerCase() + "_" + crypto.randomBytes(16).toString("hex");

const platforms = [
  { name: "QuickRide", type: "ride-hailing",  email: "admin@quickride.demo" },
  { name: "HomeFix",   type: "home-services", email: "admin@homefix.demo" },
  { name: "FoodDash",  type: "food-delivery", email: "admin@fooddash.demo" },
];

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB" + (ROTATE ? "  — ROTATING API KEYS" : ""));
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10); // never store plain passwords

  for (const p of platforms) {
    let platform = await Platform.findOne({ name: p.name });
    if (!platform) {
      platform = await Platform.create({ ...p, apiKey: newKey(p.name), passwordHash });
      console.log(`\n${p.name} (new)`);
    } else {
      platform.type = p.type;
      platform.email = p.email;
      platform.passwordHash = passwordHash;
      if (ROTATE) platform.apiKey = newKey(p.name);
      await platform.save();
      console.log(`\n${p.name} (${ROTATE ? "key rotated" : "kept"})`);
    }
    console.log(`  Login:   ${p.email} / ${DEMO_PASSWORD}`);
    console.log(`  API key: ${platform.apiKey}`);
  }
  await mongoose.disconnect();
})();
