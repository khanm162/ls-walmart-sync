const { getWalmartTaggedItems } = require("../lib/lightspeed");

module.exports = async function handler(req, res) {
  try {
    const offset = Number(req.query.offset || 0);

    const items = await getWalmartTaggedItems(offset, 10);

    res.status(200).json({
      success: true,
      count: items.length,
      sample: items.slice(0, 3),
    });
  } catch (err) {
    console.error("LS PRODUCT ERROR:", err.response?.data || err.message);
    res.status(500).json({
      error: err.message,
      details: err.response?.data
    });
  }
};