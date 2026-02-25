const { getWalmartTaggedItems } = require("../lib/lightspeed");

module.exports = async function handler(req, res) {
  try {
    const items = await getWalmartTaggedItems(100);

    res.status(200).json({
      success: true,
      totalFound: items.length,
      sample: items.slice(0, 5),
    });
  } catch (err) {
    console.error("LS PRODUCT ERROR:", err.response?.data || err.message);

    res.status(500).json({
      error: err.message,
      details: err.response?.data,
    });
  }
};