const { getItems } = require("../lib/lightspeed");

module.exports = async function handler(req, res) {
  try {
    const items = await getItems(10);

    res.status(200).json({
      success: true,
      count: items.length,
      sample: items.slice(0, 3),
    });
  } catch (err) {
    console.error("LS PRODUCT ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};