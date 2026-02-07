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
  // Google Sheets CSV typically includes a header row. We support both:
  // 1) Header-based mapping (Vietnamese/English headers)
  // 2) Index-based mapping (A..I) as a fallback when headers are unexpected
  const first = rows[0] || [];
  const normFirst = first.map((h) => normKey(h));

  const hasHeader =
    normFirst.some((h) => h.includes("subdomain")) ||
    normFirst.some((h) => h.includes("tencongty") || (h.includes("ten") && h.includes("congty")) || h.includes("company")) ||
    normFirst.some((h) => h.includes("taxid") || h.includes("tax")) ||
    normFirst.some((h) => h.includes("diachi") || h.includes("address"));

  const headerMap = hasHeader
    ? Object.fromEntries(first.map((h, i) => [normKey(h), i]))
    : {};

  const findIdxByIncludes = (includesAny: string[]) => {
    if (!hasHeader) return -1;
    for (let i = 0; i < normFirst.length; i++) {
      const k = normFirst[i] || "";
      if (includesAny.some((t) => k.includes(t))) return i;
    }
    return -1;
  };

  // Prefer exact keys (fast), then fallback to fuzzy "includes"
  const idx = hasHeader
    ? {
        subdomain:
          headerMap["cot_a_subdomain"] ??
          headerMap["subdomain"] ??
          findIdxByIncludes(["subdomain"]),
        businessName:
          headerMap["cot_b_ten_cong_ty"] ??
          headerMap["ten_cong_ty"] ??
          headerMap["company_name"] ??
          headerMap["business_name"] ??
          findIdxByIncludes(["tencongty", "company", "businessname", "companyname"]),
        address:
          headerMap["cot_c_dia_chi"] ??
          headerMap["dia_chi"] ??
          headerMap["address"] ??
          findIdxByIncludes(["diachi", "address"]),
        taxId:
          headerMap["cot_d_tax_id"] ??
          headerMap["tax_id"] ??
          headerMap["taxid"] ??
          findIdxByIncludes(["taxid", "tax"]),
        phone:
          headerMap["cot_e_so_dien_thoai"] ??
          headerMap["so_dien_thoai"] ??
          headerMap["phone"] ??
          headerMap["business_phone"] ??
          findIdxByIncludes(["sodienthoai", "phone"]),
        website:
          headerMap["cot_f_web"] ??
          headerMap["web"] ??
          headerMap["website"] ??
          findIdxByIncludes(["website", "web", "site"]),
        email:
          headerMap["cot_g_email"] ??
          headerMap["email"] ??
          findIdxByIncludes(["email"]),
        veridomainHtml:
          headerMap["cot_h_veridomain_fb_html"] ??
          headerMap["veridomain_fb_html"] ??
          headerMap["veridomain"] ??
          headerMap["html"] ??
          findIdxByIncludes(["veridomain", "html"]),
        dnsStatus:
          headerMap["cot_i_dns_status"] ??
          headerMap["dns_status"] ??
          headerMap["dnsstatus"] ??
          findIdxByIncludes(["dnsstatus", "dns_status", "dns"]),
      }
    : {
        // No header: fixed positions A..I
        subdomain: 0,
        businessName: 1,
        address: 2,
        taxId: 3,
        phone: 4,
        website: 5,
        email: 6,
        veridomainHtml: 7,
        dnsStatus: 8,
      };

  const start = hasHeader ? 1 : 0;

  const out: BizRecord[] = [];
  for (let r = start; r < rows.length; r++) {
    const row = rows[r] || [];

    const cell = (i: number) => (i >= 0 ? (row[i] ?? "") : "");

    // Primary (header/index) extraction
    let slug = normalizeSubdomain(cell(idx.subdomain));
    let businessName = String(cell(idx.businessName) || "").trim();
    let address = String(cell(idx.address) || "").trim();
    let phone = String(cell(idx.phone) || "").trim();
    let taxId = String(cell(idx.taxId) || "").trim();
    let website = cleanUrl(String(cell(idx.website) || "").trim());
    let email = String(cell(idx.email) || "").trim();
    let veridomainHtml = String(cell(idx.veridomainHtml) || "");
    let dnsStatus = String(cell(idx.dnsStatus) || "").trim();

    // Fallback: if we have a valid businessName but other fields are empty,
    // try fixed A..I positions (handles weird/changed headers).
    if (businessName && row.length >= 6 && (!address && !phone && !website && !email)) {
      slug = normalizeSubdomain(row[0] ?? subdomain);
      businessName = String(row[1] ?? businessName).trim();
      address = String(row[2] ?? "").trim();
      taxId = String(row[3] ?? "").trim();
      phone = String(row[4] ?? "").trim();
      website = cleanUrl(String(row[5] ?? "").trim());
      email = String(row[6] ?? "").trim();
      veridomainHtml = String(row[7] ?? "");
      dnsStatus = String(row[8] ?? "").trim();
    }

    if (!slug || !businessName) continue;

    out.push({
      slug,
      businessName,
      address,
      phone,
      email,
      website,
      taxId,
      veridomainHtml,
      dnsStatus,
    });
  }

  return out;
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
