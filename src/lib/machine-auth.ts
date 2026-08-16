import { timingSafeEqual } from "crypto";

/** 三支生成 API 的鑑權：Bearer CRON_SECRET，constant-time 比較防 timing attack */
export function isAuthorizedMachine(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const header = request.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!provided) return false;

  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function unauthorized() {
  return Response.json({ error: "unauthorized" }, { status: 401 });
}
