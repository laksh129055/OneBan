require("dotenv").config();
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const Platform = require("./models/Platform");

const newKey = (name) => name.toLowerCase() + "_" + crypto.randomBytes(16).toString("hex");
const DEMO_PASSWORD = "demo123";

const platforms = [
  { name: "QuickRide", type: "ride-hailing",  email: "admin@quickride.demo" },
  { name: "HomeFix",   type: "home-services", email: "admin@homefix.demo" },
  { name: "FoodDash",  type: "food-delivery", email: "admin@fooddash.demo" },
];

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10); // never store plain passwords

  for (const p of platforms) {
    let platform = await Platform.findOne({ name: p.name });
    if (!platform) {
      platform = await Platform.create({ ...p, apiKey: newKey(p.name), passwordHash });
      console.log(`${p.name} (new)`);
    } else {
      platform.email = p.email;
      platform.passwordHash = passwordHash; // add login, keep the same API key
      await platform.save();
      console.log(`${p.name} (kept)`);
    }
    console.log(`  API key: ${platform.apiKey}`);
    console.log(`  Login:   ${p.email} / ${DEMO_PASSWORD}`);
  }
  await mongoose.disconnect();
})();