export async function getWalmartToken() {
  const auth = Buffer.from(
    `${process.env.WALMART_CLIENT_ID}:${process.env.WALMART_CLIENT_SECRET}`
  ).toString("base64");

  const response = await fetch(
    "https://marketplace.walmartapis.com/v3/token",
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        "WM_SVC.NAME": "Walmart Marketplace",
        "WM_QOS.CORRELATION_ID": Date.now().toString(),
      },
      body: "grant_type=client_credentials",
    }
  );

  const text = await response.text();

  try {
    const data = JSON.parse(text);
    if (!response.ok) throw new Error(JSON.stringify(data));
    return data.access_token;
  } catch {
    throw new Error(`Walmart returned non-JSON response: ${text.substring(0,200)}`);
  }
}