require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const verifyApiKey = require("./middleware/apiKey");

const app = express();
app.use(cors());
app.use(express.json());

// Open to everyone
app.get("/", (req, res) => res.json({ status: "API running" }));

// Only with a valid API key
app.get("/whoami", verifyApiKey, (req, res) => {
  res.json({ message: "Key accepted", platform: req.platform.name });
});

mongoose.connect(process.env.MONGO_URI).then(() => {
  console.log("MongoDB connected");
  app.listen(process.env.PORT, () => console.log(`API on http://localhost:${process.env.PORT}`));
});