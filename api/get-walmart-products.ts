const { Redis } = require("@upstash/redis");

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

module.exports = async function handler(req, res) {
  try {
    const cached = await redis.get("walmart_products_cache");

    if (!cached) {
      return res.status(404).json({
        message: "No walmart products synced yet."
      });
    }

    const products =
      typeof cached === "string" ? JSON.parse(cached) : cached;

    res.status(200).json({
      success: true,
      total: products.length,
      sample: products.slice(0, 5)
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};