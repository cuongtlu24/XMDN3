import { cache } from "react";

// ✅ Public Google Sheet CSV
export const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQmi6oayoemKBJXEWi4pkVHDsm166ap0XCwbopYrukBQnwj2gERseGlDnJVBrtciHwKEFj5bTqFLGiQ/pub?output=csv";

export type BizRecord = {
  slug: string; // subdomain / slug
  name: string; // legal / business name
  address: string;
  taxId?: string;
  phone?: string;
  website?: string;
  fbToken?: string; // facebook-domain-verification token
  description?: string;
  image?: string;
  status?: string; // optional (col 7)
};

function parseCsv(text: string): string[][] {
  const lines = (text || "")
    .replace(/\r/g, "")
    .split("\n")
    .filter((l) => l.trim() !== "");

  return lines.map((line) => {
    const out: string[] = [];
    let cell = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];

      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }

      if (ch === "," && !inQuotes) {
        out.push(cell.trim());
        cell = "";
      } else {
        cell += ch;
      }
    }
    out.push(cell.trim());
    return out;
  });
}

function norm(s: string) {
  return (s || "").replace(/^\ufeff/, "").trim();
}

function normKey(s: string) {
  return norm(s).toLowerCase().replace(/\s+/g, "_");
}

function cleanUrl(s?: string) {
  const v = (s || "").trim();
  if (!v) return "";
  return v.replace(/\\\//g, "/");
}

function extractFbToken(raw: string) {
  const s = (raw || "").trim();
  if (!s) return "";

  const m1 = s.match(/content\s*=\s*"([^"]+)"/i);
  if (m1?.[1]) return m1[1].trim();

  const m2 = s.match(/facebook-domain-verification\s*=\s*([A-Za-z0-9_-]+)/i);
  if (m2?.[1]) return m2[1].trim();

  if (/^[A-Za-z0-9_-]{10,}$/.test(s)) return s;
  return "";
}

/**
 * ✅ Ưu tiên: CSV có header -> map theo tên cột
 * ✅ Fallback: không có header -> dùng index theo format của bạn:
 *   [0]=slug, [1]=name, [2]=address, [3]=tax/document, [4]=phone,
 *   [5]=image(optional), [6]=fbToken(optional), [7]=status(optional), [8]=website(optional)
 */
function rowsToRecords(rows: string[][]): BizRecord[] {
  if (!rows.length) return [];

  const first = rows[0].map(normKey);
  const hasHeader =
    first.includes("slug") ||
    first.includes("subdomain") ||
    first.includes("legal_name") ||
    first.includes("name") ||
    first.includes("website") ||
    first.includes("website_url") ||
    first.includes("fb_token");

  if (hasHeader) {
    const header = first;
    const idx = (key: string) => header.indexOf(key);

    const pick = (r: string[], ...keys: string[]) => {
      for (const k of keys) {
        const i = idx(k);
        if (i >= 0 && r[i] != null && String(r[i]).trim() !== "") {
          return String(r[i]).trim();
        }
      }
      return "";
    };

    return rows
      .slice(1)
      .map((r) => {
        const slug = pick(r, "slug", "subdomain");
        const name = pick(r, "legal_name", "name", "business_name");
        const address = pick(r, "address", "address_line1");
        const taxId = pick(r, "tax_id", "taxid", "ein", "document");
        const phone = pick(r, "business_phone", "phone", "business_phone_number");
        const website = cleanUrl(pick(r, "website", "website_url", "site"));
        const fbToken = extractFbToken(
          pick(r, "fb_token", "facebook_domain_verification", "token")
        );
        const description = pick(r, "description", "desc");
        const image = pick(r, "image", "logo", "cover");
        const status = pick(r, "status");

        return {
          slug: norm(slug),
          name: norm(name),
          address: norm(address),
          taxId: norm(taxId) || undefined,
          phone: norm(phone) || undefined,
          website: website || undefined,
          fbToken: fbToken || undefined,
          description: norm(description) || undefined,
          image: norm(image) || undefined,
          status: norm(status) || undefined,
        } as BizRecord;
      })
      .filter((x) => x.slug && x.name);
  }

  // ✅ Fallback format theo sheet bạn đang dùng (không header)
  return rows
    .map((r) => {
      const slug = norm(r?.[0] || "");
      const name = norm(r?.[1] || "");
      const address = norm(r?.[2] || "");
      const taxId = norm(r?.[3] || "");
      const phone = norm(r?.[4] || "");
      const image = norm(r?.[5] || "");
      const fbToken = extractFbToken(norm(r?.[6] || ""));
      const status = norm(r?.[7] || "");
      const website = cleanUrl(norm(r?.[8] || ""));

      return {
        slug,
        name,
        address,
        taxId: taxId || undefined,
        phone: phone || undefined,
        website: website || undefined, // ✅ lấy website cột cuối
        fbToken: fbToken || undefined,
        image: image || undefined,
        status: status || undefined,
      } as BizRecord;
    })
    .filter((x) => x.slug && x.name);
}

// ✅ cache() để dedupe fetch trong cùng request
export const fetchBizRecords = cache(async (): Promise<BizRecord[]> => {
  const res = await fetch(SHEET_URL, {
    cache: "no-store",
    redirect: "follow",
    headers: {
      "user-agent": "Mozilla/5.0",
      accept: "text/csv,text/plain,*/*",
    },
  });

  if (!res.ok) throw new Error(`Fetch CSV failed: ${res.status}`);
  const text = await res.text();
  const rows = parseCsv(text);
  return rowsToRecords(rows);
});
