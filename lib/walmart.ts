let cachedToken: string | null = null;
let tokenExpiry: number = 0;

export async function getWalmartToken() {
  const now = Date.now();

  if (cachedToken && now < tokenExpiry) {
    return cachedToken;
  }

  const auth = Buffer.from(
    `${process.env.WALMART_CLIENT_ID}:${process.env.WALMART_CLIENT_SECRET}`
  ).toString("base64");

  const response = await fetch(
    `${process.env.WALMART_BASE_URL}/v3/token`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Walmart auth failed: ${JSON.stringify(data)}`);
  }

  cachedToken = data.access_token;
  tokenExpiry = now + (data.expires_in - 60) * 1000;

  return cachedToken;
}