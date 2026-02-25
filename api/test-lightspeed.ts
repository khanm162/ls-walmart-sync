import type { VercelRequest, VercelResponse } from "@vercel/node";
import { testLightspeedConnection } from "../lib/lightspeed";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const data = await testLightspeedConnection();
    res.json({ success: true, account: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}