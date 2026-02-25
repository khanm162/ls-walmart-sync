import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getItems } from "../lib/lightspeed";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const items = await getItems(10);
    res.json({
      success: true,
      count: items.length,
      sample: items.slice(0, 3)
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}