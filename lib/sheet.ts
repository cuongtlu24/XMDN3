import { cache } from "react";

// ✅ Public Google Sheet CSV
export const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRuhYBuTRYdpdh-qvRrr8cPlvSLiDSgRqkTn5tSLsQmErRentHQdUZz9idNd9ihYaohYemQ-9Sx3as6/pub?gid=0&single=true&output=csv";

export type BizRecord = {
  // Sheet columns (A → I)
  slug: string; // Column A (Subdomain)
  businessName: string; // Column B (Tên công ty)
  address: string; // Column C (Địa chỉ)
  taxId: string; // Column D (Tax ID)
  phone: string; // Column E (Số điện thoại)
  website: string; // Column F (Web)
  email: string; // Column G (Email)
  fbDomainVerificationHtml: string; // Column H (Veridomain fb html)
  dnsStatus: string; // Column I (DNS Status)
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
  // Normalize Vietnamese headers like "Cột A (Subdomain)" → "cot_a_subdomain"
  return norm(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function cleanUrl(s?: string) {
  const v = (s || "").trim();
  if (!v) return "";
  return v.replace(/\\\//g, "/");
}

export function extractFbToken(raw: string) {
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
 * ✅ Ưu tiên: CSV có header -> map theo tên cột.
 * Sheet mới (A → I):
 * A Subdomain | B Company | C Address | D Tax ID | E Phone | F Website | G Email | H FB html | I DNS Status
 */
function rowsToRecords(rows: string[][]): BizRecord[] {
  if (!rows.length) return [];

  const first = rows[0].map(normKey);
  const hasHeader =
    first.some((x) => x.includes("subdomain")) ||
    first.some((x) => x.startsWith("cot_a")) ||
    first.includes("slug");

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
        const slug = pick(r, "cot_a_subdomain", "subdomain", "slug");
        const businessName = pick(r, "cot_b_ten_cong_ty", "company", "business_name", "name");
        const address = pick(r, "cot_c_dia_chi", "address");
        const taxId = pick(r, "cot_d_tax_id", "tax_id", "ein", "taxid");
        const phone = pick(r, "cot_e_so_dien_thoai", "phone", "business_phone");
        const website = cleanUrl(pick(r, "cot_f_web", "website", "site"));
        const email = pick(r, "cot_g_email", "email");
        const fbHtml = pick(r, "cot_h_veridomain_fb_html", "facebook_domain_verification", "fb_html", "fb_token");
        const dnsStatus = pick(r, "cot_i_dns_status", "dns_status", "status");

        return {
          slug: norm(slug),
          businessName: norm(businessName),
          address: norm(address),
          taxId: norm(taxId),
          phone: norm(phone),
          website: website,
          email: norm(email),
          fbDomainVerificationHtml: norm(fbHtml),
          dnsStatus: norm(dnsStatus),
        } as BizRecord;
      })
      .filter((x) => x.slug && x.businessName);
  }

  // ✅ Fallback: không có header (theo thứ tự cột A → I)
  return rows
    .map((r) => {
      const slug = norm(r?.[0] || "");
      const businessName = norm(r?.[1] || "");
      const address = norm(r?.[2] || "");
      const taxId = norm(r?.[3] || "");
      const phone = norm(r?.[4] || "");
      const website = cleanUrl(norm(r?.[5] || ""));
      const email = norm(r?.[6] || "");
      const fbHtml = norm(r?.[7] || "");
      const dnsStatus = norm(r?.[8] || "");

      return {
        slug,
        businessName,
        address,
        taxId,
        phone,
        website,
        email,
        fbDomainVerificationHtml: fbHtml,
        dnsStatus,
      } as BizRecord;
    })
    .filter((x) => x.slug && x.businessName);
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
