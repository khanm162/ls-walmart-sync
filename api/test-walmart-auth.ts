import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getWalmartToken } from "../lib/walmart";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const token = await getWalmartToken();
    res.status(200).json({ success: true, tokenPreview: token.substring(0, 20) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}