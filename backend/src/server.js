require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const verifyApiKey = require("./middleware/apiKey");
const authPlatform = require("./middleware/auth");

const app = express();
app.use(cors());
app.use(express.json());

// Open to everyone
app.get("/", (req, res) => res.json({ status: "API running" }));

// Test route — only with a valid API key
app.get("/whoami", verifyApiKey, (req, res) => {
  res.json({ message: "Key accepted", platform: req.platform.name });
});

// Portal login
app.use("/auth", require("./routes/auth"));

// Main features — work with an API key OR a portal login token
app.use("/signal", authPlatform, require("./routes/signal"));
app.use("/check", authPlatform, require("./routes/check"));

mongoose.connect(process.env.MONGO_URI).then(() => {
  console.log("MongoDB connected");
  app.listen(process.env.PORT, () => console.log(`API on http://localhost:${process.env.PORT}`));
});