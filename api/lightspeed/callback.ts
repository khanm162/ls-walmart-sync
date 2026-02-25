import type { VercelRequest, VercelResponse } from "@vercel/node";
import { exchangeCodeForToken } from "../../lib/lightspeed";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { code } = req.query;

  if (!code || typeof code !== "string") {
    return res.status(400).send("Missing code");
  }

  try {
    await exchangeCodeForToken(code);
    res.send("Lightspeed connected successfully.");
  } catch (err: any) {
    res.status(500).send("OAuth failed: " + err.message);
  }
}