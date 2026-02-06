import { headers } from "next/headers";

function norm(s: string) {
  return (s || "").replace(/^\ufeff/, "").trim().toLowerCase();
}

// Chuẩn hoá ô slug (có thể là "abc" hoặc "https://abc.domain...")
export function normalizeSlugCell(cell: string) {
  const v = norm(cell).replace(/^https?:\/\//, "").replace(/^www\./, "");
  return (v.split(".")[0] || "").trim().toLowerCase();
}

// Lấy subdomain từ host: abc.domain.com -> abc
export function subFromHost(host: string) {
  const h = (host || "").split(",")[0].trim().toLowerCase().split(":")[0];
  if (!h) return "";
  if (h === "localhost") return "";
  if (h.endsWith(".vercel.app")) return "";

  const parts = h.split(".");
  if (parts.length >= 3) {
    const sub = parts[0];
    if (sub && sub !== "www") return sub;
  }
  return "";
}

// ✅ Ưu tiên query ?__sub= để test, sau đó ưu tiên header do middleware set, cuối cùng mới lấy host
export async function resolveWantedSlug(searchParams?: Record<string, any>) {
  const spSub = typeof searchParams?.__sub === "string" ? norm(searchParams.__sub) : "";
  if (spSub) return spSub;

  const h = await headers();
  const fromHeader = norm(h.get("x-subdomain") || "");
  if (fromHeader) return fromHeader;

  const host = h.get("x-forwarded-host") || h.get("host") || "";
  return norm(subFromHost(host));
}
