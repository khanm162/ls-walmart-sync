const { syncWalmartProducts } = require("../lib/lightspeed");

module.exports = async function handler(req, res) {
  try {
    const result = await syncWalmartProducts(100);

    res.status(200).json({
      success: true,
      ...result
    });

  } catch (err) {
    console.error("SYNC ERROR:", err.response?.data || err.message);

    res.status(500).json({
      error: err.message,
      details: err.response?.data
    });
  }
};