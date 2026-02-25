import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(req: VercelRequest, res: VercelResponse) {
  const url =
    `https://cloud.lightspeedapp.com/auth/oauth/authorize` +
    `?response_type=code` +
    `&client_id=${process.env.LIGHTSPEED_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(process.env.LIGHTSPEED_REDIRECT_URI!)}` +
    `&scope=employee:register employee:all`;

  res.redirect(url);
}