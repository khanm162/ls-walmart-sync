const axios = require("axios");
const { Redis } = require("@upstash/redis");

const TOKEN_URL = "https://cloud.lightspeedapp.com/auth/oauth/token";
const API_BASE = "https://api.lightspeedapp.com";
const ACCOUNT_ID = process.env.LIGHTSPEED_ACCOUNT_ID;

const TOKEN_KEY = "lightspeed_tokens_walmart";
const WALMART_TAG_ID = 1335; // ← your Lightspeed tag ID

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

let accessToken = null;
let refreshToken = null;

/* =========================
   OAUTH
========================= */

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

  await redis.set(
    TOKEN_KEY,
    JSON.stringify({ accessToken, refreshToken })
  );

  return accessToken;
}

async function loadTokens() {
  const saved = await redis.get(TOKEN_KEY);
  if (!saved) return false;

  const tokens =
    typeof saved === "string" ? JSON.parse(saved) : saved;

  accessToken = tokens.accessToken;
  refreshToken = tokens.refreshToken;

  return true;
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

  await redis.set(
    TOKEN_KEY,
    JSON.stringify({ accessToken, refreshToken })
  );

  return accessToken;
}

async function hasValidToken() {
  if (accessToken) return true;

  const loaded = await loadTokens();
  if (loaded) return true;

  return false;
}

function authHeader() {
  if (!accessToken) throw new Error("No LS token loaded");
  return { Authorization: `Bearer ${accessToken}` };
}

/* =========================
   TEST CONNECTION
========================= */

async function testLightspeedConnection() {
  if (!(await hasValidToken())) {
    try {
      await refreshAccessToken();
    } catch (err) {
      throw new Error("Lightspeed authentication required.");
    }
  }

  const res = await axios.get(
    `${API_BASE}/API/Account/${ACCOUNT_ID}.json`,
    { headers: authHeader() }
  );

  return res.data;
}

/* =========================
   FETCH ALL ITEMS (GENERIC)
========================= */

async function getItems(offset = 0, limit = 50) {
  if (!(await hasValidToken())) {
    await refreshAccessToken();
  }

  const res = await axios.get(
    `${API_BASE}/API/Account/${ACCOUNT_ID}/Item.json`,
    {
      headers: authHeader(),
      params: {
        offset,
        limit
      }
    }
  );

  if (!res.data || !res.data.Item) {
    return [];
  }

  return Array.isArray(res.data.Item)
    ? res.data.Item
    : [res.data.Item];
}

/* =========================
   FETCH WALMART TAGGED ITEMS
========================= */

async function getWalmartTaggedItems(offset = 0, limit = 100) {
  if (!(await hasValidToken())) {
    await refreshAccessToken();
  }

  // STEP 1: Get TagItem mapping
  const tagRes = await axios.get(
    `${API_BASE}/API/Account/${ACCOUNT_ID}/TagItem.json`,
    {
      headers: authHeader(),
      params: {
        tagID: WALMART_TAG_ID,
        offset,
        limit
      }
    }
  );

  if (!tagRes.data || !tagRes.data.TagItem) {
    return [];
  }

  const tagItems = Array.isArray(tagRes.data.TagItem)
    ? tagRes.data.TagItem
    : [tagRes.data.TagItem];

  const itemIDs = tagItems.map(t => t.itemID);

  if (itemIDs.length === 0) return [];

  // STEP 2: Fetch actual items
  const itemRes = await axios.get(
    `${API_BASE}/API/Account/${ACCOUNT_ID}/Item.json`,
    {
      headers: authHeader(),
      params: {
        itemID: itemIDs.join(",")
      }
    }
  );

  if (!itemRes.data || !itemRes.data.Item) {
    return [];
  }

  return Array.isArray(itemRes.data.Item)
    ? itemRes.data.Item
    : [itemRes.data.Item];
}

/* =========================
   EXPORTS
========================= */

module.exports = {
  exchangeCodeForToken,
  loadTokens,
  refreshAccessToken,
  hasValidToken,
  testLightspeedConnection,
  getItems,
  getWalmartTaggedItems
};