const crypto = require("crypto");

// "+91 98765-43210" → "9876543210"
function normalizePhone(phone = "") {
  return String(phone).replace(/\D/g, "").slice(-10);
}

// "dl 1234" → "DL1234"
function normalizeId(id = "") {
  return String(id).toUpperCase().replace(/\s|-/g, "");
}

// Hash with the secret key — can't be reversed without the secret
function hmac(value) {
  return crypto.createHmac("sha256", process.env.HMAC_SECRET).update(value).digest("hex");
}

function hashIdentity({ phone, idToken }) {
  const p = normalizePhone(phone);
  const i = normalizeId(idToken);
  return {
    phoneHash: p ? hmac("phone:" + p) : null,
    idHash: i ? hmac("id:" + i) : null,
  };
}

module.exports = { hashIdentity };
