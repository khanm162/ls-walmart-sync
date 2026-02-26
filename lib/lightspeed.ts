const axios = require("axios");
const { Redis } = require("@upstash/redis");

const TOKEN_URL = "https://cloud.lightspeedapp.com/auth/oauth/token";
const API_BASE = "https://api.lightspeedapp.com/API/V3";
const ACCOUNT_ID = process.env.LIGHTSPEED_ACCOUNT_ID;

const TOKEN_KEY = "lightspeed_tokens_walmart";

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

let accessToken = null;
let refreshToken = null;

/* =========================
   TOKEN MANAGEMENT
========================= */

async function loadTokens() {
  const saved = await redis.get(TOKEN_KEY);
  if (!saved) return false;

  const tokens =
    typeof saved === "string" ? JSON.parse(saved) : saved;

  accessToken = tokens.accessToken;
  refreshToken = tokens.refreshToken;

  return true;
}

async function saveTokens() {
  await redis.set(
    TOKEN_KEY,
    JSON.stringify({ accessToken, refreshToken })
  );
}

async function exchangeCodeForToken(code) {
  const res = await axios.post(
    TOKEN_URL,
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: process.env.LIGHTSPEED_CLIENT_ID,
      client_secret: process.env.LIGHTSPEED_CLIENT_SECRET,
      redirect_uri: process.env.LIGHTSPEED_REDIRECT_URI,
    }).toString(),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );

  accessToken = res.data.access_token;
  refreshToken = res.data.refresh_token;

  await saveTokens();

  return accessToken;
}

async function refreshAccessToken() {
  if (!refreshToken) {
    const loaded = await loadTokens();
    if (!loaded) throw new Error("No refresh token stored");
  }

  const res = await axios.post(
    TOKEN_URL,
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: process.env.LIGHTSPEED_CLIENT_ID,
      client_secret: process.env.LIGHTSPEED_CLIENT_SECRET,
    }).toString(),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );

  accessToken = res.data.access_token;
  refreshToken = res.data.refresh_token || refreshToken;

  await saveTokens();

  return accessToken;
}

async function ensureValidToken() {
  if (!accessToken) {
    const loaded = await loadTokens();
    if (!loaded) throw new Error("Lightspeed not authenticated");
  }

  try {
    await axios.get(
      `${API_BASE}/Account/${ACCOUNT_ID}.json`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
  } catch (err) {
    await refreshAccessToken();
  }
}

function authHeader() {
  if (!accessToken) throw new Error("No LS token loaded");
  return { Authorization: `Bearer ${accessToken}` };
}

/* =========================
   TEST CONNECTION
========================= */

async function testLightspeedConnection() {
  await ensureValidToken();

  const res = await axios.get(
    `${API_BASE}/Account/${ACCOUNT_ID}.json`,
    { headers: authHeader() }
  );

  return res.data;
}

/* =========================
   FETCH ALL ITEMS
========================= */

async function getItems(offset = 0, limit = 50) {
  await ensureValidToken();

  const res = await axios.get(
    `${API_BASE}/Account/${ACCOUNT_ID}/Item.json`,
    {
      headers: authHeader(),
      params: { offset, limit }
    }
  );

  if (!res.data || !res.data.Item) return [];

  return Array.isArray(res.data.Item)
    ? res.data.Item
    : [res.data.Item];
}

/* =========================
   SYNC WALMART PRODUCTS
========================= */

async function syncWalmartProducts(limitPerPage = 100) {
  await ensureValidToken();

  let nextUrl =
    `${API_BASE}/Account/${ACCOUNT_ID}/Item.json` +
    `?load_relations=["Tags","ItemShops"]&limit=${limitPerPage}`;

  let walmartItems = [];
  let pageCount = 0;

  while (nextUrl) {
    console.log("Fetching page:", pageCount + 1);

    const res = await axios.get(nextUrl, {
      headers: authHeader(),
    });

    const data = res.data;
    const items = data.Item || [];
    const normalized = Array.isArray(items) ? items : [items];

    for (const item of normalized) {
      if (!item.Tags || !item.Tags.tag) continue;

      const tags = item.Tags.tag;

      const hasWalmartTag =
        (Array.isArray(tags) && tags.includes("walmart")) ||
        tags === "walmart";

      if (!hasWalmartTag) continue;

      // ✅ Extract Shopify price (useTypeID 10)
      const shopifyPrice =
        item.Prices?.ItemPrice?.find(
          (p) => p.useTypeID === "10"
        )?.amount || null;

      // ✅ Extract inventory from shopID 3
      let inventory = 0;

      if (item.ItemShops?.ItemShop) {
        const shops = Array.isArray(item.ItemShops.ItemShop)
          ? item.ItemShops.ItemShop
          : [item.ItemShops.ItemShop];

        const primoShop = shops.find(
          (s) => s.shopID === "3"
        );

        inventory = primoShop?.qoh || 0;
      }

      // ✅ Store CLEAN optimized object
      walmartItems.push({
        itemID: item.itemID,
        sku: item.systemSku,
        title: item.description,
        upc: item.upc,
        price: shopifyPrice,
        quantity: inventory,
        categoryID: item.categoryID,
      });
    }

    nextUrl = data["@attributes"]?.next || null;
    pageCount++;
  }

  console.log("Sync complete. Found:", walmartItems.length);

  await redis.set(
    "walmart_products_cache",
    JSON.stringify(walmartItems)
  );

  return {
    totalPagesScanned: pageCount,
    totalWalmartProducts: walmartItems.length,
  };
}

/* =========================
   EXPORTS
========================= */

module.exports = {
  exchangeCodeForToken,
  testLightspeedConnection,
  getItems,
  syncWalmartProducts
};